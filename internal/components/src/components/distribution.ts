import pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DnsValidatedCertificate } from "./dns-validated-certificate";
import { HttpsRedirect } from "./https-redirect";
import { normalize } from "path";

/**
 * The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
 *
 * Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
 *
 * @example
 * ```js
 * new StaticSite(this, "Site", {
 *   path: "path/to/src",
 *   customDomain: "domain.com",
 * });
 * ```
 *
 * @example
 * ```js
 * new StaticSite(this, "Site", {
 *   path: "path/to/src",
 *   customDomain: {
 *     domainName: "domain.com",
 *     aliases: ["www.domain.com"],
 *     hostedZone: "domain.com",
 *   }
 * });
 * ```
 */
export interface DistributionDomainArgs {
  /**
   * The domain to be assigned to the website URL (ie. domain.com).
   *
   * Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   */
  domainName: pulumi.Input<string>;
  /**
   * Alternative domains to be assigned to the website URL. Visitors to the alias will be redirected to the main domain. (ie. `www.domain.com`).
   *
   * Use this to create a `www.` version of your domain and redirect visitors to the root domain.
   * @default no redirects configured
   */
  redirects?: pulumi.Input<string[]>;
  /**
   * Specify additional names that should route to the Cloudfront Distribution.
   * @default `[]`
   */
  aliases?: pulumi.Input<string[]>;
  /**
   * The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone matching the domainName that's passed in.
   *
   * Set this option if SST cannot find the hosted zone in Route 53.
   * @default same as the `domainName`
   */
  hostedZone?: pulumi.Input<string>;
  // TODO - SST design: input: how to accept host zone id?
  //aws?: {
  //  hostedZoneId?: string;
  //};
  //// or
  //hostedZoneId?: string;
}

export interface DistributionArgs {
  distribution: aws.cloudfront.DistributionArgs;
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
   *   domainAlias: "www.domain.com",
   *   hostedZone: "domain.com"
   * },
   * ```
   */
  customDomain?: pulumi.Input<string | DistributionDomainArgs>;
}

export class Distribution extends pulumi.ComponentResource {
  private distribution: aws.cloudfront.Distribution;

  constructor(name: string, args: DistributionArgs) {
    super("sst:sst:Distribution", name, args);

    const { distribution: distributionArgs } = args;
    const customDomain = normalizeCustomDomain();

    validateCloudFrontDistributionSettings();

    const zoneId = lookupHostedZoneId();
    const certificate = createCertificate();
    const distribution = createDistribution();
    createRoute53Records();
    createRedirects();

    this.distribution = distribution;

    function normalizeCustomDomain() {
      if (!args.customDomain) return;

      return pulumi
        .output([args.customDomain])
        .apply(([customDomain]) =>
          typeof customDomain === "string"
            ? { domainName: customDomain, aliases: [], redirects: [] }
            : { aliases: [], redirects: [], ...customDomain }
        );
    }

    function validateCloudFrontDistributionSettings() {
      if (distributionArgs.viewerCertificate) {
        throw new Error(
          `Do not configure the "distribution.certificate". Use the "customDomain" to configure the domain certificate.`
        );
      }
      if (distributionArgs.aliases) {
        throw new Error(
          `Do not configure the "distribution.aliases". Use the "customDomain" to configure the domain name.`
        );
      }
    }

    function lookupHostedZoneId() {
      const { customDomain } = this.props;

      if (!customDomain) return;

      let zoneName;
      if (typeof customDomain === "string") {
        zoneName = customDomain;
      } else if (typeof customDomain.hostedZone === "string") {
        zoneName = customDomain.hostedZone;
      } else if (
        typeof customDomain.domainName === "string" &&
        !customDomain.isExternalDomain
      ) {
        zoneName = customDomain.domainName;
      } else {
        return;
      }

      return aws.route53
        .getZone({ name: zoneName })
        .then((zone) => zone.zoneId);
    }

    function createCertificate() {
      if (!customDomain || !zoneId) return;

      return new DnsValidatedCertificate("certificate", {
        domainName: customDomain.domainName,
        alternativeNames: customDomain.aliases,
        zoneId,
        region: "us-east-1",
      });
    }

    function createDistribution() {
      const aliases = customDomain
        ? pulumi
            .all([customDomain])
            .apply(([customDomain]) => [
              customDomain.domainName,
              ...customDomain.aliases,
            ])
        : [];
      return new aws.cloudfront.Distribution("distribution", {
        ...distributionArgs,
        aliases,
        viewerCertificate: certificate
          ? {
              acmCertificateArn: certificate.certificateArn,
              sslSupportMethod: "sni-only",
            }
          : {
              cloudfrontDefaultCertificate: true,
            },
      });
    }

    function createRoute53Records(): void {
      if (!customDomain || !zoneId) {
        return;
      }

      // Create DNS record
      pulumi.all([customDomain]).apply(([customDomain]) => {
        for (const name of [customDomain.domainName, ...customDomain.aliases]) {
          for (const type of ["A", "AAAA"]) {
            new aws.route53.Record(`record-${name}-${type}`, {
              name,
              zoneId,
              type,
              aliases: [
                {
                  name: distribution.domainName,
                  zoneId: distribution.hostedZoneId,
                  evaluateTargetHealth: true,
                },
              ],
            });
          }
        }
      });
    }

    function createRedirects(): void {
      if (!zoneId || !customDomain) {
        return;
      }

      pulumi.all([customDomain]).apply(([customDomain]) => {
        if (customDomain.redirects.length === 0) return;

        new HttpsRedirect("redirect", {
          zoneId,
          sourceDomains: customDomain.redirects,
          targetDomain: customDomain.domainName,
        });
      });
    }
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    return pulumi.interpolate`https://${this.distribution.domainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get customDomainUrl() {
    return (
      this.distribution.aliases[0] &&
      pulumi.interpolate`https://${this.distribution.aliases[0]}`
    );
  }

  public get aws() {
    return {
      distribution: this.distribution,
    };
  }
}
