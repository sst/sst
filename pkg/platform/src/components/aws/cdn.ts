import {
  Output,
  ComponentResourceOptions,
  output,
  interpolate,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DnsValidatedCertificate } from "./dns-validated-certificate.js";
import { HttpsRedirect } from "./https-redirect.js";
import { useProvider } from "./helpers/provider.js";
import { Component, Prettify, Transform, transform } from "../component.js";
import { Input } from "../input.js";
import { DistributionDeploymentWaiter } from "./providers/distribution-deployment-waiter.js";
import { Dns } from "../dns.js";
import { dns as awsDns } from "./dns.js";

export interface CdnDomainArgs {
  /**
   * The custom domain you want to use. Supports domains hosted on [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   *
   * @example
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   */
  name: Input<string>;
  /**
   * Alternate domains to be used. Visitors to the alternate domains will be redirected to the
   * main `name`.
   *
   * :::note
   * Unlike the `aliases` option, this will redirect visitors back to the main `name`.
   * :::
   *
   * @example
   * Use this to create a `www.` version of your domain and redirect visitors to the apex domain.
   * ```js {4}
   * {
   *   domain: {
   *     name: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  redirects?: Input<string[]>;
  /**
   * Alias domains that should be used. Unlike the `redirect` option, this keeps your visitors
   * on this alias domain.
   *
   * @example
   * So if your users visit `app2.domain.com`, they will stay on `app2.domain.com` in their
   * browser.
   * ```js {4}
   * {
   *   domain: {
   *     name: "app1.domain.com",
   *     aliases: ["app2.domain.com"]
   *   }
   * }
   * ```
   */
  aliases?: Input<string[]>;
  /**
   * The ARN of an existing certificate in the `us-east-1` region in AWS Certificate Manager
   * to use for the domain. By default, SST will create a certificate with the domain name.
   * The certificate will be created in the `us-east-1`(N. Virginia) region as required by
   * AWS CloudFront.
   *
   * :::note
   * If `dns` is set to `false`, you must provide a validated certificate. And you have to add the DNS records manually to point to the CloudFront distribution URL.
   * :::
   *
   * @example
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     cert: "arn:aws:acm:us-east-1:112233445566:certificate/3a958790-8878-4cdc-a396-06d95064cf63"
   *   }
   * }
   * ```
   */
  cert?: Input<string>;
  /**
   * The DNS adapter you want to use for managing DNS records.
   *
   * :::note
   * If your domain is hosted on a platform that isn't supported by our adapters, you'll need to
   * set `dns` to `false`. And pass in a validated `cert`.
   * :::
   *
   * @default `sst.aws.dns`
   * @example
   *
   * Specify the hosted zone ID for the domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     dns: sst.aws.dns({
   *       zone: "Z2FDTNDATAQYW2"
   *     })
   *   }
   * }
   * ```
   *
   * Domain is hosted on Cloudflare.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     dns: sst.cloudflare.dns()
   *   }
   * }
   * ```
   */
  dns?: Input<false | (Dns & {})>;
}

export interface CdnArgs {
  /**
   * A comment to describe the distribution. It cannot be longer than 128 characters.
   */
  comment?: Input<string>;
  /**
   * One or more origins for this distribution.
   */
  origins: aws.cloudfront.DistributionArgs["origins"];
  /**
   * One or more origin groups for this distribution.
   */
  originGroups?: aws.cloudfront.DistributionArgs["originGroups"];
  /**
   * The default cache behavior for this distribution.
   */
  defaultCacheBehavior: aws.cloudfront.DistributionArgs["defaultCacheBehavior"];
  /**
   * An ordered list of cache behaviors for this distribution. Listed in order of precedence. The first cache behavior will have precedence 0.
   */
  orderedCacheBehaviors?: aws.cloudfront.DistributionArgs["orderedCacheBehaviors"];
  /**
   * An object you want CloudFront to return when a user requests the root URL. For example, the `index.html`.
   */
  defaultRootObject?: aws.cloudfront.DistributionArgs["defaultRootObject"];
  /**
   * One or more custom error responses.
   */
  customErrorResponses?: aws.cloudfront.DistributionArgs["customErrorResponses"];
  /**
   * Set a custom domain for your distribution. Supports domains hosted either on
   * [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   *
   * @example
   *
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   *
   * Specify a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: Input<string | Prettify<CdnDomainArgs>>;
  /**
   * Whether to wait for the CloudFront distribution to be deployed before
   * completing the deployment of the app. This is necessary if you need to use the
   * distribution URL in other resources.
   * @default `true`
   */
  wait?: Input<boolean>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying resources.
   */
  transform?: {
    /**
     * Transform the CloudFront distribution resource.
     */
    distribution: Transform<aws.cloudfront.DistributionArgs>;
  };
}

/**
 * The `Cdn` component is internally used by other components to deploy a CDN to AWS. It uses [Amazon CloudFront](https://aws.amazon.com/cloudfront/) and [Amazon Route 53](https://aws.amazon.com/route53/) to manage custom domains.
 *
 * :::caution
 * This component is not intended for public use.
 * :::
 *
 * @example
 *
 * You'll find this component exposed in the `transform` of other components. And you can customize the args listed here. For example:
 *
 * ```ts
 * new sst.aws.Nextjs("MyWeb", {
 *   transform: {
 *     cdn: (args) => {
 *       args.wait = false;
 *     }
 *   }
 * });
 * ```
 */
export class Cdn extends Component {
  private distribution: Output<aws.cloudfront.Distribution>;
  private _domainUrl?: Output<string>;

  constructor(name: string, args: CdnArgs, opts?: ComponentResourceOptions) {
    super(pulumiType, name, args, opts);
    const parent = this;

    const domain = normalizeDomain();

    const certificateArn = createSsl();
    const distribution = createDistribution();
    const waiter = createDistributionDeploymentWaiter();
    createDnsRecords();
    createRedirects();

    this.distribution = waiter.isDone.apply(() => distribution);
    this._domainUrl = domain?.name
      ? interpolate`https://${domain.name}`
      : undefined;

    function normalizeDomain() {
      if (!args.domain) return;

      // validate
      output(args.domain).apply((domain) => {
        if (typeof domain === "string") return;

        if (!domain.name) throw new Error(`Missing "name" for domain.`);
        if (domain.dns === false && !domain.cert)
          throw new Error(
            `Need to provide a validated certificate via "cert" when DNS is disabled`,
          );
        if (domain.dns === false && domain.redirects?.length)
          throw new Error(`Redirects are not supported when DNS is disabled`);
      });

      // normalize
      return output(args.domain).apply((domain) => {
        const norm = typeof domain === "string" ? { name: domain } : domain;

        return {
          name: norm.name,
          aliases: norm.aliases ?? [],
          redirects: norm.redirects ?? [],
          dns: norm.dns === false ? undefined : norm.dns ?? awsDns(),
          cert: norm.cert,
        };
      });
    }

    function createSsl() {
      if (!domain) return;

      return domain.apply((domain) => {
        if (domain.cert) return output(domain.cert);

        // Certificates used for CloudFront distributions are required to be
        // created in the us-east-1 region
        return new DnsValidatedCertificate(
          `${name}Ssl`,
          {
            domainName: domain.name,
            alternativeNames: domain.aliases,
            dns: domain.dns!,
          },
          { parent, provider: useProvider("us-east-1") },
        ).arn;
      });
    }

    function createDistribution() {
      return new aws.cloudfront.Distribution(
        `${name}Distribution`,
        transform(args.transform?.distribution, {
          comment: args.comment,
          enabled: true,
          origins: args.origins,
          originGroups: args.originGroups,
          defaultCacheBehavior: args.defaultCacheBehavior,
          orderedCacheBehaviors: args.orderedCacheBehaviors,
          defaultRootObject: args.defaultRootObject,
          customErrorResponses: args.customErrorResponses,
          restrictions: {
            geoRestriction: {
              restrictionType: "none",
            },
          },
          aliases: domain
            ? output(domain).apply((domain) => [domain.name, ...domain.aliases])
            : [],
          viewerCertificate: certificateArn
            ? {
              acmCertificateArn: certificateArn,
              sslSupportMethod: "sni-only",
              minimumProtocolVersion: "TLSv1.2_2021",
            }
            : {
              cloudfrontDefaultCertificate: true,
            },
          waitForDeployment: false,
        }),
        {
          parent,
        },
      );
    }

    function createDistributionDeploymentWaiter() {
      return output(args.wait).apply((wait) => {
        return new DistributionDeploymentWaiter(
          `${name}Waiter`,
          {
            distributionId: distribution.id,
            etag: distribution.etag,
            wait: wait ?? true,
          },
          { parent, ignoreChanges: wait ? undefined : ["*"] },
        );
      });
    }

    function createDnsRecords() {
      if (!domain) return;

      domain.apply((domain) => {
        if (!domain.dns) return;

        for (const recordName of [domain.name, ...domain.aliases]) {
          if (domain.dns.provider === "aws") {
            domain.dns.createAliasRecords(
              name,
              {
                name: recordName,
                aliasName: distribution.domainName,
                aliasZone: distribution.hostedZoneId,
              },
              { parent },
            );
          } else {
            domain.dns.createRecord(
              name,
              {
                type: "CNAME",
                name: recordName,
                value: distribution.domainName,
              },
              { parent },
            );
          }
        }
      });
    }

    function createRedirects(): void {
      if (!domain) return;

      output(domain).apply((domain) => {
        if (!domain.redirects.length) return;

        new HttpsRedirect(
          `${name}Redirect`,
          {
            sourceDomains: domain.redirects,
            targetDomain: domain.name,
            dns: domain.dns!,
          },
          { parent },
        );
      });
    }
  }

  /**
   * The CloudFront URL of the distribution.
   */
  public get url() {
    return interpolate`https://${this.distribution.domainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the distribution with the
   * custom domain.
   */
  public get domainUrl() {
    return this._domainUrl;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon CloudFront distribution.
       */
      distribution: this.distribution,
    };
  }
}

const pulumiType = "sst:aws:CDN";
// @ts-expect-error
Cdn.__pulumiType = pulumiType;
