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
import { sanitizeToPascalCase } from "../naming.js";
import { HostedZoneLookup } from "./providers/hosted-zone-lookup.js";
import { Input } from "../input.js";
import { DistributionDeploymentWaiter } from "./providers/distribution-deployment-waiter.js";

export interface CdnDomainArgs {
  /**
   * The custom domain you want to use. Supports domains hosted on [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   * @example
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   */
  domainName: Input<string>;
  /**
   * Alternate domains to be used. Visitors to the alternate domains will be redirected to the
   * main `domainName`.
   *
   * :::note
   * Unlike the `aliases` option, this will redirect visitors back to the main `domainName`.
   * :::
   *
   * @example
   * Use this to create a `www.` version of your domain and redirect visitors to the apex domain.
   * ```js {4}
   * {
   *   domain: {
   *     domainName: "domain.com",
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
   *     domainName: "app1.domain.com",
   *     aliases: ["app2.domain.com"]
   *   }
   * }
   * ```
   */
  aliases?: Input<string[]>;
  /**
   * Name of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone name in the Route 53 part of the AWS Console.

   *
   * Usually your domain name is in a hosted zone with the same name. For example,
   * `domain.com` might be in a hosted zone also called `domain.com`. So by default, SST will
   * look for a hosted zone that matches the `domainName`.
   *
   * There are cases where these might not be the same. For example, if you use a subdomain,
   * `app.domain.com`, the hosted zone might be `domain.com`. So you'll need to pass in the
   * hosted zone name.
   *
   * :::note
   * If both the `hostedZone` and `hostedZoneId` are set, `hostedZoneId` will take precedence.
   * :::
   *
   * @default Same as the `domainName`
   * @example
   * ```js {4}
   * {
   *   domain: {
   *     domainName: "app.domain.com",
   *     hostedZone: "domain.com"
   *   }
   * }
   * ```
   */
  hostedZone?: Input<string>;
  /**
   * The 14 letter ID of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone ID in the Route 53 part of the AWS Console.
   *
   * This option is useful for cases where you have multiple hosted zones that have the same
   * domain.
   *
   * :::note
   * If both the `hostedZone` and `hostedZoneId` are set, `hostedZoneId` will take precedence.
   * :::
   *
   * @example
   * ```js {4}
   * {
   *   domain: {
   *     domainName: "domain.com",
   *     hostedZoneId: "Z2FDTNDATAQYW2"
   *   }
   * }
   * ```
   */
  hostedZoneId?: Input<string>;
}

export interface CdnArgs {
  /**
   * Set a custom domain for your SSR site. Supports domains hosted either on
   * [Route 53](https://aws.amazon.com/route53/) or outside AWS.
   *
   * :::tip
   * You can also migrate an externally hosted domain to Amazon Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   * :::
   *
   * @example
   *
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   *
   * Specify the Route 53 hosted zone and a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     domainName: "domain.com",
   *     hostedZone: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: Input<string | Prettify<CdnDomainArgs>>;
  /**
   * Whether to wait for the CloudFront distribution to be deployed before
   * completing the deployment. This is useful if you need to use the
   * distribution URL in other resources.
   * @default `true`
   * @example
   * ```js
   * wait: false,
   * ```
   */
  wait?: Input<boolean>;
  transform: {
    distribution: Transform<aws.cloudfront.DistributionArgs>;
  };
}

export class Cdn extends Component {
  private distribution: Output<aws.cloudfront.Distribution>;
  private _domainUrl?: Output<string>;

  constructor(name: string, args: CdnArgs, opts?: ComponentResourceOptions) {
    super("sst:aws:CDN", name, args, opts);
    const parent = this;

    const domain = normalizeDomain();

    const zoneId = lookupHostedZoneId();
    const certificate = createSsl();
    const distribution = createDistribution();
    const waiter = createDistributionDeploymentWaiter();
    createRoute53Records();
    createRedirects();

    this.distribution = waiter.isDone.apply(() => distribution);
    this._domainUrl = domain?.domainName
      ? interpolate`https://${domain.domainName}`
      : undefined;

    function normalizeDomain() {
      if (!args.domain) return;

      return output(args.domain).apply((domain) => {
        if (typeof domain === "string") {
          return { domainName: domain, aliases: [], redirects: [] };
        }

        if (!domain.domainName) {
          throw new Error(`Missing "domainName" for domain.`);
        }
        if (domain.hostedZone && domain.hostedZoneId) {
          throw new Error(`Do not set both "hostedZone" and "hostedZoneId".`);
        }
        return { aliases: [], redirects: [], ...domain };
      });
    }

    function lookupHostedZoneId() {
      if (!domain) return;

      return domain.apply((domain) => {
        if (domain.hostedZoneId) return output(domain.hostedZoneId);

        return new HostedZoneLookup(
          `${name}HostedZoneLookup`,
          {
            domain: domain.hostedZone ?? domain.domainName,
          },
          { parent },
        ).zoneId;
      });
    }

    function createSsl() {
      if (!domain || !zoneId) return;

      // Certificates used for CloudFront distributions are required to be
      // created in the us-east-1 region
      return new DnsValidatedCertificate(
        `${name}Ssl`,
        {
          domainName: domain.domainName,
          alternativeNames: domain.aliases,
          zoneId,
        },
        { parent, provider: useProvider("us-east-1") },
      );
    }

    function createDistribution() {
      return new aws.cloudfront.Distribution(
        `${name}Distribution`,
        transform(args.transform.distribution, {
          defaultCacheBehavior: {
            allowedMethods: [],
            cachedMethods: [],
            targetOriginId: "placeholder",
            viewerProtocolPolicy: "redirect-to-https",
          },
          enabled: true,
          origins: [],
          restrictions: {
            geoRestriction: {
              restrictionType: "none",
            },
          },
          aliases: domain
            ? output(domain).apply((domain) => [
                domain.domainName,
                ...domain.aliases,
              ])
            : [],
          viewerCertificate: certificate
            ? {
                acmCertificateArn: certificate.arn,
                sslSupportMethod: "sni-only",
                minimumProtocolVersion: "TLSv1.2_2021"
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

    function createRoute53Records(): void {
      if (!domain || !zoneId) {
        return;
      }

      // Create DNS record
      output(domain).apply((domain) => {
        for (const recordName of [domain.domainName, ...domain.aliases]) {
          for (const type of ["A", "AAAA"]) {
            new aws.route53.Record(
              `${name}${type}Record${sanitizeToPascalCase(recordName)}`,
              {
                name: recordName,
                zoneId,
                type,
                aliases: [
                  {
                    name: distribution.domainName,
                    zoneId: distribution.hostedZoneId,
                    evaluateTargetHealth: true,
                  },
                ],
              },
              { parent },
            );
          }
        }
      });
    }

    function createRedirects(): void {
      if (!zoneId || !domain) {
        return;
      }

      output(domain).apply((domain) => {
        if (domain.redirects.length === 0) return;

        new HttpsRedirect(
          `${name}Redirect`,
          {
            zoneId,
            sourceDomains: domain.redirects,
            targetDomain: domain.domainName,
          },
          { parent },
        );
      });
    }
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    return interpolate`https://${this.distribution.domainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get domainUrl() {
    return this._domainUrl;
  }

  public get nodes() {
    return {
      distribution: this.distribution,
    };
  }
}
