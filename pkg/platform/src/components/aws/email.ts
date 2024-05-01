import {
  ComponentResourceOptions,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import { Input } from "../input";
import { Dns } from "../dns";
import { dns as awsDns } from "./dns.js";

export interface EmailArgs {
  /**
   * The email address or domain that you want to send email from.
   *
   * @example
   * Using an email address as the sender
   *
   * ```ts
   * new sst.aws.Email("MyEmail", {
   *   sender: "john.smith@gmail.com",
   * });
   * ```
   *
   * Using a domain as the sender
   *
   * ```ts
   * new sst.aws.Email("MyEmailDomain", {
   *   sender: "domain.com",
   * });
   * ```
   */
  sender: Input<string>;
  /**
   * The DNS adapter you want to use for managing DNS records. You should only
   * specify this for domain senders. You will get an error if you specify this
   * for email address senders.
   *
   * :::note
   * If `dns` is set to `false`, you have to add the DNS records manually to verify
   * the domain.
   * :::
   *
   * @default `sst.aws.dns`
   * @example
   *
   * Specify the hosted zone ID for the domain.
   *
   * ```js
   * {
   *   dns: sst.aws.dns({
   *     zone: "Z2FDTNDATAQYW2"
   *   })
   * }
   * ```
   *
   * Domain is hosted on Cloudflare.
   *
   * ```js
   * {
   *   dns: sst.cloudflare.dns()
   * }
   * ```
   */
  dns?: Input<false | (Dns & {})>;
  /**
   * The DMARC policy for the domain. SST will create a DNS record with the DMARC policy.
   * You will get an error if you specify this for email address senders.
   * @default `"v=DMARC1; p=none;"`
   * @example
   * ```js
   * {
   *   dmarc: "v=DMARC1; p=quarantine; adkim=s; aspf=s;"
   * }
   * ```
   */
  dmarc?: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the SES identity resource.
     */
    identity?: Transform<aws.sesv2.EmailIdentityArgs>;
  };
}

/**
 * The `Email` component lets you send emails in your app.
 * It uses [Amazon Simple Email Service](https://aws.amazon.com/ses/).
 *
 * You can enable sending from an email address or all email addresses in a domain.
 *
 * #### Sending from an email address
 *
 * For using an email address as the sender, you need to verify the email address.
 * When you deploy your app, you will receive an email from AWS SES to verify the
 * email address. You need to click the link in the email to verify.
 *
 * ```ts
 * new sst.aws.Email("MyEmail", {
 *   sender: "john.smith@gmail.com",
 * });
 * ```
 *
 * #### Sending from all email addresses in a domain
 *
 * When you use a domain as the sender, you don't need to verify individual email
 * addresses in the domain. Once you verify the domain, you can send emails from
 * **all email addresses in the domain**.
 *
 * To verify the domain, you need to add the verification records to your domain DNS.
 * The component will create the DNS records for you.
 *
 * In addition, the component will also create a DMARC record for the domain with the
 * default value: `v=DMARC1; p=none;`.
 *
 * ```ts
 * new sst.aws.Email("MyEmailDomain", {
 *   sender: "domain.com",
 * });
 * ```
 *
 * :::note
 * By default, your AWS SES accounts is in the Amazon SES sandbox. You can only send
 * email to verified email addresses and domains. And your account has a limited sending
 * quota. To remove these restrictions, you need to [request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
 * :::
 */
export class Email
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private _sender: Output<string>;
  private identity: aws.sesv2.EmailIdentity;

  constructor(name: string, args: EmailArgs, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const isDomain = checkIsDomain();
    const dns = normalizeDns();
    const dmarc = normalizeDmarc();
    const identity = createIdentity();
    isDomain.apply((isDomain) => {
      if (!isDomain) return;
      createDkimRecords();
      createDmarcRecord();
      waitForVerification();
    });

    this._sender = output(args.sender);
    this.identity = identity;

    function checkIsDomain() {
      return output(args.sender).apply((sender) => !sender.includes("@"));
    }

    function normalizeDns() {
      all([args.dns, isDomain]).apply(([dns, isDomain]) => {
        if (!isDomain && dns)
          throw new Error(
            `The "dns" property is only valid when "sender" is a domain.`,
          );
      });

      return args.dns ?? awsDns();
    }

    function normalizeDmarc() {
      all([args.dmarc, isDomain]).apply(([dmarc, isDomain]) => {
        if (!isDomain && dmarc)
          throw new Error(
            `The "dmarc" property is only valid when "sender" is a domain.`,
          );
      });

      return args.dmarc ?? `v=DMARC1; p=none;`;
    }

    function createIdentity() {
      return new aws.sesv2.EmailIdentity(
        `${name}Identity`,
        transform(args.transform?.identity, { emailIdentity: args.sender }),
        { parent },
      );
    }

    function createDkimRecords() {
      all([dns, identity?.dkimSigningAttributes.tokens]).apply(
        ([dns, tokens]) => {
          if (!dns) return;

          tokens?.map((token) =>
            dns.createRecord(
              name,
              {
                type: "CNAME",
                name: interpolate`${token}._domainkey.${args.sender}`,
                value: `${token}.dkim.amazonses.com`,
              },
              { parent },
            ),
          );
        },
      );
    }

    function createDmarcRecord() {
      output(dns).apply((dns) => {
        if (!dns) return;

        dns.createRecord(
          name,
          {
            type: "TXT",
            name: interpolate`_dmarc.${args.sender}`,
            value: dmarc,
          },
          { parent },
        );
      });
    }

    function waitForVerification() {
      new aws.ses.DomainIdentityVerification(
        `${name}Verification`,
        {
          domain: args.sender,
        },
        { parent, dependsOn: identity },
      );
    }
  }

  /**
   * The sender email address or domain.
   */
  public get sender() {
    return this._sender;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon SES identity.
       */
      identity: this.identity,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        sender: this._sender,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["ses:*"],
        resources: [this.identity.arn],
      },
    ];
  }
}

const __pulumiType = "sst:aws:Email";
// @ts-expect-error
Email.__pulumiType = __pulumiType;
