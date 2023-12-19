import {
  Input,
  Output,
  ComponentResourceOptions,
  output,
  interpolate,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DnsValidatedCertificate } from "./dns-validated-certificate.js";
import { HttpsRedirect } from "./https-redirect.js";
import { AWS } from "./helpers/aws.js";
import { Component } from "./component.js";
import { sanitizeToPascalCase } from "./helpers/naming.js";

export interface DistributionDomainArgs {
  /**
   * The domain to be assigned to the website URL (ie. domain.com).
   *
   * Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   */
  domainName: Input<string>;
  /**
   * Alternative domains to be assigned to the website URL. Visitors to the alternative domains will be redirected to the main domain. (ie. `www.domain.com`).
   * Use this to create a `www.` version of your domain and redirect visitors to the root domain.
   * @default no redirects configured
   * @example
   * ```js
   * customDomain: {
   *   domainName: "domain.com",
   *   redirects: ["www.domain.com"],
   * }
   * ```
   */
  redirects?: Input<string[]>;
  /**
   * Specify additional names that should route to the Cloudfront Distribution.
   * @default no aliases configured
   * @example
   * ```js
   * customDomain: {
   *   domainName: "app1.domain.com",
   *   aliases: ["app2.domain.com"],
   * }
   * ```
   */
  aliases?: Input<string[]>;
  /**
   * Name of the hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone matching the domain name that's passed in.
   * Do not set both "hostedZone" and "hostedZoneId".
   * @default same as the `domainName`
   * @example
   * ```js
   * customDomain: {
   *   domainName: "app.domain.com",
   *   hostedZone: "domain.com",
   * }
   * ```
   */
  hostedZone?: Input<string>;
  /**
   * The 14 letter id of the hosted zone in Route 53 that contains the domain.
   * Only set this option if there are multiple hosted zones of the same domain in Route 53.
   * Do not set both "hostedZone" and "hostedZoneId".
   * @example
   * ```js
   * customDomain: {
   *   domainName: "domain.com",
   *   hostedZoneId: "Z2FDTNDATAQYW2",
   * }
   * ```
   */
  hostedZoneId?: Input<string>;
}

export interface DistributionArgs {
  /**
   * The customDomain for this website. SST supports domains that are hosted
   * either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * customDomain: "domain.com",
   * ```
   *
   * ```js
   * customDomain: {
   *   domainName: "domain.com",
   *   redirects: ["www.domain.com"],
   * },
   * ```
   */
  customDomain?: Input<string | DistributionDomainArgs>;
  nodes: {
    distribution: Omit<aws.cloudfront.DistributionArgs, "viewerCertificate">;
  };
}

export class Distribution extends Component {
  private distribution: aws.cloudfront.Distribution;
  private _customDomainUrl?: Output<string>;

  constructor(
    name: string,
    args: DistributionArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:sst:Distribution", name, args, opts);
    const parent = this;

    const customDomain = normalizeCustomDomain();

    validateDistributionSettings();

    const zoneId = lookupHostedZoneId();
    const certificate = createCertificate();
    const distribution = createDistribution();
    createRoute53Records();
    createRedirects();

    this.distribution = distribution;
    this._customDomainUrl = customDomain?.domainName
      ? interpolate`https://${customDomain.domainName}`
      : undefined;

    function normalizeCustomDomain() {
      if (!args.customDomain) return;

      return output(args.customDomain).apply((customDomain) => {
        if (typeof customDomain === "string") {
          return { domainName: customDomain, aliases: [], redirects: [] };
        }

        if (!customDomain.domainName) {
          throw new Error(`Missing "domainName" for customDomain.`);
        }
        if (customDomain.hostedZone && customDomain.hostedZoneId) {
          throw new Error(`Do not set both "hostedZone" and "hostedZoneId".`);
        }
        return { aliases: [], redirects: [], ...customDomain };
      });
    }

    function validateDistributionSettings() {
      if (
        (args.nodes.distribution as aws.cloudfront.DistributionArgs)
          .viewerCertificate
      ) {
        throw new Error(
          `Do not configure the "distribution.certificate". Use the "customDomain" to configure the domain certificate.`,
        );
      }
      if (
        (args.nodes.distribution as aws.cloudfront.DistributionArgs).aliases
      ) {
        throw new Error(
          `Do not configure the "distribution.aliases". Use the "customDomain" to configure the domain name.`,
        );
      }
    }

    function lookupHostedZoneId() {
      if (!customDomain) return;

      return output(customDomain).apply(async (customDomain) => {
        if (customDomain.hostedZoneId) return customDomain.hostedZoneId;

        const zoneName = customDomain.hostedZone ?? customDomain.domainName;
        const zone = await aws.route53.getZone({ name: zoneName });
        return zone.zoneId;
      });
    }

    function createCertificate() {
      if (!customDomain || !zoneId) return;

      // Certificates used for CloudFront distributions are required to be
      // created in the us-east-1 region
      return new DnsValidatedCertificate(
        `${name}Certificate`,
        {
          domainName: customDomain.domainName,
          alternativeNames: customDomain.aliases,
          zoneId,
        },
        { parent, provider: AWS.useProvider("us-east-1") },
      );
    }

    function createDistribution() {
      const aliases = customDomain
        ? output(customDomain).apply((customDomain) => [
            customDomain.domainName,
            ...customDomain.aliases,
          ])
        : [];
      return new aws.cloudfront.Distribution(
        `${name}Distribution`,
        {
          aliases,
          viewerCertificate: certificate
            ? {
                acmCertificateArn: certificate.certificateArn,
                sslSupportMethod: "sni-only",
              }
            : {
                cloudfrontDefaultCertificate: true,
              },
          ...args.nodes.distribution,
        },
        { parent },
      );
    }

    function createRoute53Records(): void {
      if (!customDomain || !zoneId) {
        return;
      }

      // Create DNS record
      output(customDomain).apply((customDomain) => {
        for (const recordName of [
          customDomain.domainName,
          ...customDomain.aliases,
        ]) {
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
      if (!zoneId || !customDomain) {
        return;
      }

      output(customDomain).apply((customDomain) => {
        if (customDomain.redirects.length === 0) return;

        new HttpsRedirect(
          `${name}Redirect`,
          {
            zoneId,
            sourceDomains: customDomain.redirects,
            targetDomain: customDomain.domainName,
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
  public get customDomainUrl() {
    return this._customDomainUrl;
  }

  public get nodes() {
    return {
      distribution: this.distribution,
    };
  }
}
