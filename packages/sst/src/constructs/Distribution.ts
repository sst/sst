import { Construct, IConstruct } from "constructs";
import { CustomResource } from "aws-cdk-lib/core";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  HostedZone,
  IHostedZone,
  ARecord,
  AaaaRecord,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import {
  Distribution as CdkDistribution,
  DistributionProps as CdkDistributionProps,
  IDistribution,
} from "aws-cdk-lib/aws-cloudfront";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";

import { Stack } from "./Stack.js";
import { isCDKConstruct } from "./Construct.js";
import { HttpsRedirect } from "./cdk/website-redirect.js";
import { DnsValidatedCertificate } from "./cdk/dns-validated-certificate.js";

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
export interface DistributionDomainProps {
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
    hostedZone?: IHostedZone;
    /**
     * Import the certificate for the domain. By default, SST will create a certificate with the domain name. The certificate will be created in the `us-east-1`(N. Virginia) region as required by AWS CloudFront.
     *
     * Set this option if you have an existing certificate in the `us-east-1` region in AWS Certificate Manager you want to use.
     */
    certificate?: ICertificate;
  };
}

export interface DistributionProps {
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
  customDomain?: string | DistributionDomainProps;
  /**
   * The SSR function is deployed to Lambda in a single region. Alternatively, you can enable this option to deploy to Lambda@Edge.
   * @default false
   */
  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   * @default false
   */
  waitForInvalidation?: boolean;
  scopeOverride?: IConstruct;
  cdk: {
    distribution: CdkDistributionProps;
  };
}

export class Distribution extends Construct {
  private scope: IConstruct;
  private props: DistributionProps;
  private distribution: IDistribution;
  private hostedZone?: IHostedZone;
  private certificate?: ICertificate;

  constructor(scope: Construct, id: string, props: DistributionProps) {
    super(scope, id);

    // Override scope
    // note: this is intended to be used internally by SST to make constructs
    //       backwards compatible when the hirechical structure of the constructs
    //       changes. When the hirerchical structure changes, the child AWS
    //       resources' logical ID will change. And CloudFormation will recreate
    //       them.
    this.scope = props.scopeOverride || this;

    this.props = props;

    const isImportedCloudFrontDistribution = (
      distribution?: IDistribution | CdkDistributionProps
    ): distribution is IDistribution => {
      return distribution !== undefined && isCDKConstruct(distribution);
    };

    // cdk.distribution is an imported construct
    if (isImportedCloudFrontDistribution(props.cdk?.distribution)) {
      this.distribution = props.cdk?.distribution as IDistribution;
      return;
    }

    this.validateCustomDomainSettings();
    this.validateCloudFrontDistributionSettings();

    this.hostedZone = this.lookupHostedZone();
    this.certificate = this.createCertificate();
    this.distribution = this.createDistribution();
    this.createRoute53Records();
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    return `https://${this.distribution.distributionDomainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get customDomainUrl() {
    const { customDomain } = this.props;
    if (!customDomain) return;

    if (typeof customDomain === "string") {
      return `https://${customDomain}`;
    } else {
      return `https://${customDomain.domainName}`;
    }
  }

  /**
   * The internally created CDK resources.
   */
  public get cdk() {
    return {
      distribution: this.distribution,
      hostedZone: this.hostedZone,
      certificate: this.certificate,
    };
  }

  public createInvalidation(buildId?: string) {
    const stack = Stack.of(this) as Stack;

    const policy = new Policy(this.scope, "CloudFrontInvalidatorPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "cloudfront:GetInvalidation",
            "cloudfront:CreateInvalidation",
          ],
          resources: [
            `arn:${stack.partition}:cloudfront::${stack.account}:distribution/${this.distribution.distributionId}`,
          ],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);

    const resource = new CustomResource(this.scope, "CloudFrontInvalidator", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::CloudFrontInvalidator",
      properties: {
        buildId: buildId || Date.now().toString(),
        distributionId: this.distribution.distributionId,
        paths: ["/*"],
        waitForInvalidation: this.props.waitForInvalidation,
      },
    });
    resource.node.addDependency(policy);

    return resource;
  }

  private validateCloudFrontDistributionSettings() {
    const { cdk } = this.props;
    if (cdk?.distribution?.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the domain certificate.`
      );
    }
    if (cdk?.distribution?.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the domain name.`
      );
    }
  }

  private validateCustomDomainSettings() {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    if (typeof customDomain === "string") {
      return;
    }

    if (customDomain.isExternalDomain === true) {
      if (!customDomain.cdk?.certificate) {
        throw new Error(
          `A valid certificate is required when "isExternalDomain" is set to "true".`
        );
      }
      if (customDomain.domainAlias) {
        throw new Error(
          `Domain alias is only supported for domains hosted on Amazon Route 53. Do not set the "customDomain.domainAlias" when "isExternalDomain" is enabled.`
        );
      }
      if (customDomain.hostedZone) {
        throw new Error(
          `Hosted zones can only be configured for domains hosted on Amazon Route 53. Do not set the "customDomain.hostedZone" when "isExternalDomain" is enabled.`
        );
      }
    }
  }

  private lookupHostedZone(): IHostedZone | undefined {
    const { customDomain } = this.props;

    // Skip if customDomain is not configured
    if (!customDomain) {
      return;
    }

    let hostedZone;

    if (typeof customDomain === "string") {
      hostedZone = HostedZone.fromLookup(this.scope, "HostedZone", {
        domainName: customDomain,
      });
    } else if (customDomain.cdk?.hostedZone) {
      hostedZone = customDomain.cdk.hostedZone;
    } else if (typeof customDomain.hostedZone === "string") {
      hostedZone = HostedZone.fromLookup(this.scope, "HostedZone", {
        domainName: customDomain.hostedZone,
      });
    } else if (typeof customDomain.domainName === "string") {
      // Skip if domain is not a Route53 domain
      if (customDomain.isExternalDomain === true) {
        return;
      }

      hostedZone = HostedZone.fromLookup(this.scope, "HostedZone", {
        domainName: customDomain.domainName,
      });
    } else {
      hostedZone = customDomain.hostedZone;
    }

    return hostedZone;
  }

  private createCertificate(): ICertificate | undefined {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    let acmCertificate;

    // HostedZone is set for Route 53 domains
    if (this.hostedZone) {
      if (typeof customDomain === "string") {
        acmCertificate = new DnsValidatedCertificate(
          this.scope,
          "Certificate",
          {
            domainName: customDomain,
            hostedZone: this.hostedZone,
            region: "us-east-1",
          }
        );
      } else if (customDomain.cdk?.certificate) {
        acmCertificate = customDomain.cdk.certificate;
      } else {
        acmCertificate = new DnsValidatedCertificate(
          this.scope,
          "Certificate",
          {
            domainName: customDomain.domainName,
            hostedZone: this.hostedZone,
            region: "us-east-1",
          }
        );
      }
    }
    // HostedZone is NOT set for non-Route 53 domains
    else {
      if (typeof customDomain !== "string") {
        acmCertificate = customDomain.cdk?.certificate;
      }
    }

    return acmCertificate;
  }

  private createDistribution(): CdkDistribution {
    const { cdk } = this.props;

    return new CdkDistribution(this.scope, "Distribution", {
      ...cdk?.distribution,
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.certificate,
    });
  }

  private buildDistributionDomainNames(): string[] {
    const { customDomain } = this.props;
    const domainNames = [];
    if (!customDomain) {
      // no domain
    } else if (typeof customDomain === "string") {
      domainNames.push(customDomain);
    } else {
      domainNames.push(customDomain.domainName);
      if (customDomain.alternateNames) {
        if (!customDomain.cdk?.certificate)
          throw new Error(
            "Certificates for alternate domains cannot be automatically created. Please specify certificate to use"
          );
        domainNames.push(...customDomain.alternateNames);
      }
    }
    return domainNames;
  }

  private createRoute53Records(): void {
    const { customDomain } = this.props;

    if (!customDomain || !this.hostedZone) {
      return;
    }

    let recordName;
    let domainAlias;
    if (typeof customDomain === "string") {
      recordName = customDomain;
    } else {
      recordName = customDomain.domainName;
      domainAlias = customDomain.domainAlias;
    }

    // Create DNS record
    const recordProps = {
      recordName,
      zone: this.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
    };
    new ARecord(this.scope, "AliasRecord", recordProps);
    new AaaaRecord(this.scope, "AliasRecordAAAA", recordProps);

    // Create Alias redirect record
    if (domainAlias) {
      new HttpsRedirect(this.scope, "Redirect", {
        zone: this.hostedZone,
        recordNames: [domainAlias],
        targetDomain: recordName,
      });
    }
  }
}
