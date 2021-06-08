import * as path from "path";
import * as fs from "fs-extra";
import { execSync } from "child_process";

import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Deploy from "@aws-cdk/aws-s3-deployment";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as cfOrigins from "@aws-cdk/aws-cloudfront-origins";
import { App } from "./App";

export interface StaticSiteProps {
  readonly path: string;
  readonly indexPage?: string;
  readonly errorPage?: string;
  readonly buildCommand?: string;
  readonly buildOutput?: string;
  readonly customDomain?: string | StaticSiteDomainProps;
  readonly s3Bucket?: s3.BucketProps;
  readonly cfDistribution?: StaticSiteCdkDistributionProps;
}

export interface StaticSiteDomainProps {
  readonly domainName: string;
  readonly domainAlias?: string;
  readonly hostedZone?: string | route53.IHostedZone;
  readonly certificate?: acm.ICertificate;
}

export interface StaticSiteCdkDistributionProps
  extends Omit<cf.DistributionProps, "defaultBehavior"> {
  readonly defaultBehavior?: cf.BehaviorOptions;
}

export class StaticSite extends cdk.Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly hostedZone?: route53.IHostedZone;
  public readonly acmCertificate?: acm.ICertificate;
  public readonly cfDistribution: cf.Distribution;

  constructor(scope: cdk.Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const root = scope.node.root as App;

    // Normalize props
    props.buildOutput = props.buildOutput || "build";
    props.indexPage = props.indexPage || "index.html";
    props.errorPage = props.errorPage || props.indexPage;

    this.buildApp(props);
    this.s3Bucket = this.createS3Bucket(props);
    this.hostedZone = this.lookupHostedZone(props);
    this.acmCertificate = this.createCertificate(props);
    this.cfDistribution = this.createCfDistribution(props);
    this.createRoute53Records(props);
    this.createS3Deployment(props);
  }

  public get bucketUrl(): string {
    return this.s3Bucket.bucketWebsiteUrl;
  }

  public get bucketArn(): string {
    return this.s3Bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.s3Bucket.bucketName;
  }

  public get cloudfrontDomain(): string {
    return this.cfDistribution.domainName;
  }

  public get cloudfrontDistributionDomain(): string {
    return this.cfDistribution.distributionDomainName;
  }

  private buildApp(props: StaticSiteProps) {
    const { path: sitePath, buildCommand } = props;

    // Determine installer
    if (!buildCommand) {
      buildCommand = fs.existsSync(path.join(sitePath, "yarn.lock"))
        ? "yarn build"
        : "npm run build";
    }

    try {
      execSync(buildCommand, {
        cwd: sitePath,
        stdio: "inherit",
      });
    } catch (e) {
      console.log(e.stdout.toString());
      console.log(e.stderr.toString());
      throw new Error(
        `There was a problem building the "${this.node.id}" StaticSite.`
      );
    }
  }

  private createS3Bucket(props: StaticSiteProps): s3.Bucket {
    const { s3Bucket, indexPage, errorPage } = props;
    return new s3.Bucket(this, "Bucket", {
      websiteIndexDocument: indexPage,
      websiteErrorDocument: errorPage,
      publicReadAccess: true,
      ...(s3Bucket || {}),
    });
  }

  private lookupHostedZone(
    props: StaticSiteProps
  ): route53.IHostedZone | undefined {
    const { customDomain } = props;

    if (!customDomain) {
      return;
    }

    let hostedZone;

    if (typeof customDomain === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain,
      });
    } else if (typeof customDomain.domainName === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.domainName,
      });
    } else {
      hostedZone = customDomain.hostedZone;
    }

    return hostedZone;
  }

  private createCertificate(
    props: StaticSiteProps
  ): acm.Certificate | undefined {
    const { customDomain } = props;

    if (!customDomain) {
      return;
    }

    let acmCertificate;

    if (typeof customDomain === "string") {
      acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
        domainName: customDomain,
        hostedZone: this.hostedZone!,
      });
    } else if (typeof customDomain.domainName === "string") {
      acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
        domainName: customDomain,
        subjectAlternativeNames: customDomain.domainAlias
          ? [customDomain.domainAlias]
          : [],
        hostedZone: this.hostedZone!,
      });
    } else {
      acmCertificate = customDomain.certificate;
    }

    return acmCertificate;
  }

  private createCfDistribution(props: StaticSiteProps): cf.Distribution {
    const { cfDistribution, indexPage, errorPage, customDomain } = props;

    const domainNames = [];
    if (!customDomain) {
      // no domain
    } else if (typeof customDomain === "string") {
      domainNames.push(customDomain);
    } else {
      domainNames.push(customDomain.domainName);
      if (customDomain.domainAlias) {
        domainNames.push(customDomain.domainAlias);
      }
    }

    // Create CF distribution
    return new cf.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new cfOrigins.S3Origin(this.s3Bucket),
      },
      domainNames,
      certificate: this.acmCertificate,
      errorResponses: [
        {
          httpStatus: 403,
          responsePagePath: `/${errorPage}`,
          responseHttpStatus: 200,
        },
        {
          httpStatus: 404,
          responsePagePath: `/${errorPage}`,
          responseHttpStatus: 200,
        },
      ],
      ...(cfDistribution || {}),
    });
  }

  private createRoute53Records(props: StaticSiteProps): void {
    const { customDomain } = props;

    if (!customDomain) {
      return;
    }

    // Create DNS record
    new route53.ARecord(this, "AliasRecord", {
      recordName: customDomain,
      zone: this.hostedZone!,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(cfDistribution)
      ),
    });
  }

  private createS3Deployment(props: StaticSiteProps): void {
    const { path: sitePath, buildOutput } = props;
    new s3Deploy.BucketDeployment(this, "BucketDeployment", {
      sources: [s3Deploy.Source.asset(path.join(sitePath, buildOutput))],
      destinationBucket: this.s3Bucket,
      distribution: this.cfDistribution,
      distributionPaths: ["/*"],
    });
  }
}
