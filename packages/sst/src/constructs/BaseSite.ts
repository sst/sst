import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

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
 *     domainAlias: "www.domain.com",
 *     hostedZone: "domain.com",
 *   }
 * });
 * ```
 */
export interface BaseSiteDomainProps {
  /**
   * The domain to be assigned to the website URL (ie. domain.com).
   *
   * Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   */
  domainName: string;
  /**
   * An alternative domain to be assigned to the website URL. Visitors to the alias will be redirected to the main domain. (ie. `www.domain.com`).
   *
   * Use this to create a `www.` version of your domain and redirect visitors to the root domain.
   * @default no alias configured
   */
  domainAlias?: string;
  /**
   * The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone matching the domainName that's passed in.
   *
   * Set this option if SST cannot find the hosted zone in Route 53.
   * @default same as the `domainName`
   */
  hostedZone?: string;
  /**
   * Specify additional names that should route to the Cloudfront Distribution. Note, certificates for these names will not be automatically generated so the `certificate` option must be specified.
   * @default `[]`
   */
  alternateNames?: string[];
  /**
   * Set this option if the domain is not hosted on Amazon Route 53.
   * @default `false`
   */
  isExternalDomain?: boolean;
  cdk?: {
    /**
     * Import the underlying Route 53 hosted zone.
     */
    hostedZone?: route53.IHostedZone;
    /**
     * Import the certificate for the domain. By default, SST will create a certificate with the domain name. The certificate will be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.
     *
     * Set this option if you have an existing certificate in the `us-east-1` region in AWS Certificate Manager you want to use.
     */
    certificate?: acm.ICertificate;
  };
}

export interface BaseSiteEnvironmentOutputsInfo {
  path: string;
  stack: string;
  environmentOutputs: { [key: string]: string };
}

export interface BaseSiteReplaceProps {
  files: string;
  search: string;
  replace: string;
}

export function buildErrorResponsesForRedirectToIndex(
  indexPage: string
): cloudfront.ErrorResponse[] {
  return [
    {
      httpStatus: 403,
      responsePagePath: `/${indexPage}`,
      responseHttpStatus: 200,
    },
    {
      httpStatus: 404,
      responsePagePath: `/${indexPage}`,
      responseHttpStatus: 200,
    },
  ];
}

export function buildErrorResponsesFor404ErrorPage(
  errorPage: string
): cloudfront.ErrorResponse[] {
  return [
    {
      httpStatus: 403,
      responsePagePath: `/${errorPage}`,
    },
    {
      httpStatus: 404,
      responsePagePath: `/${errorPage}`,
    },
  ];
}

export interface BaseSiteCdkDistributionProps
  extends Omit<cloudfront.DistributionProps, "defaultBehavior"> {
  defaultBehavior?: Omit<cloudfront.BehaviorOptions, "origin"> & {
    origin?: cloudfront.IOrigin;
  };
}

/////////////////////
// Helper Functions
/////////////////////

export function getBuildCmdEnvironment(siteEnvironment?: {
  [key: string]: string;
}): Record<string, string> {
  // Generate environment placeholders to be replaced
  // ie. environment => { API_URL: api.url }
  //     environment => API_URL="{{ API_URL }}"
  //
  const buildCmdEnvironment: Record<string, string> = {};
  Object.entries(siteEnvironment || {}).forEach(([key, value]) => {
    buildCmdEnvironment[key] = cdk.Token.isUnresolved(value)
      ? `{{ ${key} }}`
      : value;
  });

  return buildCmdEnvironment;
}
