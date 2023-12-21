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
import { HostedZoneLookup } from "./providers/hosted-zone-lookup.js";

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
   * domain: {
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
   * domain: {
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
   * domain: {
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
   * domain: {
   *   domainName: "domain.com",
   *   hostedZoneId: "Z2FDTNDATAQYW2",
   * }
   * ```
   */
  hostedZoneId?: Input<string>;
}

export interface DistributionArgs {
  /**
   * The domain for this website. SST supports domains that are hosted
   * either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by
   * [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * domain: "domain.com",
   * ```
   *
   * ```js
   * domain: {
   *   domainName: "domain.com",
   *   redirects: ["www.domain.com"],
   * },
   * ```
   */
  domain?: Input<string | DistributionDomainArgs>;
  nodes: {
    distribution: Omit<aws.cloudfront.DistributionArgs, "viewerCertificate">;
  };
}

export class Distribution extends Component {
  private distribution: aws.cloudfront.Distribution;
  private _domainUrl?: Output<string>;

  constructor(
    name: string,
    args: DistributionArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Distribution", name, args, opts);
    const parent = this;

    const domain = normalizeDomain();

    validateDistributionSettings();

    const zoneId = lookupHostedZoneId();
    const certificate = createCertificate();
    const distribution = createDistribution();
    createRoute53Records();
    createRedirects();

    this.distribution = distribution;
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

    function validateDistributionSettings() {
      if (
        (args.nodes.distribution as aws.cloudfront.DistributionArgs)
          .viewerCertificate
      ) {
        throw new Error(
          `Do not configure the "distribution.certificate". Use the "domain" to configure the domain certificate.`
        );
      }
      if (
        (args.nodes.distribution as aws.cloudfront.DistributionArgs).aliases
      ) {
        throw new Error(
          `Do not configure the "distribution.aliases". Use the "domain" to configure the domain name.`
        );
      }
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
          { parent }
        ).zoneId;
      });
    }

    function createCertificate() {
      if (!domain || !zoneId) return;

      // Certificates used for CloudFront distributions are required to be
      // created in the us-east-1 region
      return new DnsValidatedCertificate(
        `${name}Certificate`,
        {
          domainName: domain.domainName,
          alternativeNames: domain.aliases,
          zoneId,
        },
        { parent, provider: AWS.useProvider("us-east-1") }
      );
    }

    function createDistribution() {
      return new aws.cloudfront.Distribution(
        `${name}Distribution`,
        {
          aliases: domain
            ? output(domain).apply((domain) => [
                domain.domainName,
                ...domain.aliases,
              ])
            : [],
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
        { parent }
      );
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
              { parent }
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
          { parent }
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
