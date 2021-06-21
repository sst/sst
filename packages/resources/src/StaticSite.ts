import * as path from "path";
import { execSync } from "child_process";

import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Deploy from "@aws-cdk/aws-s3-deployment";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Patterns from "@aws-cdk/aws-route53-patterns";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as cfOrigins from "@aws-cdk/aws-cloudfront-origins";
import { AwsCliLayer } from "@aws-cdk/lambda-layer-awscli";

import { App } from "./App";

export interface StaticSiteProps {
  readonly path: string;
  readonly indexPage?: string;
  readonly errorPage?: string;
  readonly buildCommand?: string;
  readonly buildOutput?: string;
  readonly fileOptions?: StaticSiteFileOption[];
  readonly replaceValues?: StaticSiteReplaceProps[];
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

export interface StaticSiteFileOption {
  readonly exclude: string | string[];
  readonly include: string | string[];
  readonly cacheControl: string;
}

export interface StaticSiteReplaceProps {
  readonly files: string;
  readonly search: string;
  readonly replace: string;
}

export interface StaticSiteCdkDistributionProps
  extends Omit<cf.DistributionProps, "defaultBehavior"> {
  readonly defaultBehavior?: cf.AddBehaviorOptions;
}

export class StaticSite extends cdk.Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly cfDistribution: cf.Distribution;
  public readonly hostedZone?: route53.IHostedZone;
  public readonly acmCertificate?: acm.ICertificate;
  private readonly props: StaticSiteProps;

  constructor(scope: cdk.Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    // Handle remove (ie. sst remove)
    const root = scope.node.root as App;
    const skipBuild = root.skipBuild;
    const deployId = `deploy-${new Date().toISOString()}`;

    this.props = props;

    this.buildApp(skipBuild);
    this.s3Bucket = this.createS3Bucket();
    this.hostedZone = this.lookupHostedZone();
    this.acmCertificate = this.createCertificate();
    this.cfDistribution = this.createCfDistribution(deployId);
    this.createRoute53Records();
    this.createS3Deployment(deployId, skipBuild);
  }

  public get url(): string {
    return `https://${this.cfDistribution.distributionDomainName}`;
  }

  public get customDomainUrl(): string | undefined {
    const { customDomain } = this.props;
    if (!customDomain) {
      return;
    }

    if (typeof customDomain === "string") {
      return `https://${customDomain}`;
    } else {
      return `https://${customDomain.domainName}`;
    }
  }

  public get bucketArn(): string {
    return this.s3Bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.s3Bucket.bucketName;
  }

  public get distributionId(): string {
    return this.cfDistribution.distributionId;
  }

  public get distributionDomain(): string {
    return this.cfDistribution.distributionDomainName;
  }

  private buildApp(skipBuild: boolean) {
    const { path: sitePath, buildCommand } = this.props;

    // Skip build
    if (skipBuild) {
      return;
    }

    // Determine installer
    if (!buildCommand) {
      return;
    }

    try {
      execSync(buildCommand, {
        cwd: sitePath,
        stdio: "inherit",
      });
    } catch (e) {
      throw new Error(
        `There was a problem building the "${this.node.id}" StaticSite.`
      );
    }
  }

  private createS3Bucket(): s3.Bucket {
    let { s3Bucket } = this.props;
    s3Bucket = s3Bucket || {};

    // Validate s3Bucket
    if (s3Bucket.websiteIndexDocument) {
      throw new Error(
        `Do not configure the "s3Bucket.websiteIndexDocument". Use the "indexPage" to configure the StaticSite index page.`
      );
    }

    if (s3Bucket.websiteErrorDocument) {
      throw new Error(
        `Do not configure the "s3Bucket.websiteErrorDocument". Use the "errorPage" to configure the StaticSite index page.`
      );
    }

    return new s3.Bucket(this, "Bucket", s3Bucket);
  }

  private lookupHostedZone(): route53.IHostedZone | undefined {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    let hostedZone;

    if (typeof customDomain === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain,
      });
    } else if (typeof customDomain.hostedZone === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.hostedZone,
      });
    } else if (typeof customDomain.domainName === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.domainName,
      });
    } else {
      hostedZone = customDomain.hostedZone as route53.IHostedZone;
    }

    return hostedZone;
  }

  private createCertificate(): acm.ICertificate | undefined {
    const { customDomain } = this.props;

    if (!customDomain || !this.hostedZone) {
      return;
    }

    let acmCertificate;

    if (typeof customDomain === "string") {
      acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
        domainName: customDomain,
        hostedZone: this.hostedZone,
        region: "us-east-1",
      });
    } else if (customDomain.certificate) {
      acmCertificate = customDomain.certificate;
    } else {
      acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
        domainName: customDomain.domainName,
        hostedZone: this.hostedZone,
        region: "us-east-1",
      });
    }

    return acmCertificate;
  }

  private createCfDistribution(deployId: string): cf.Distribution {
    const { cfDistribution, customDomain } = this.props;
    const indexPage = this.props.indexPage || "index.html";
    const errorPage = this.props.errorPage || indexPage;

    const cfDistributionProps = cfDistribution || {};

    // Validate input
    if (cfDistributionProps.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the StaticSite domain certificate.`
      );
    }
    if (cfDistributionProps.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the StaticSite domain.`
      );
    }

    const domainNames = [];
    if (!customDomain) {
      // no domain
    } else if (typeof customDomain === "string") {
      domainNames.push(customDomain);
    } else {
      domainNames.push(customDomain.domainName);
    }

    // Create CF distribution
    return new cf.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: indexPage,
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
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.acmCertificate,
      defaultBehavior: {
        origin: new cfOrigins.S3Origin(this.s3Bucket, {
          originPath: deployId,
        }),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        ...(cfDistributionProps.defaultBehavior || {}),
      },
    });
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
    new route53.ARecord(this, "AliasRecord", {
      recordName,
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(this.cfDistribution)
      ),
    });

    // Create Alias redirect record
    if (domainAlias) {
      new route53Patterns.HttpsRedirect(this, "Redirect", {
        zone: this.hostedZone,
        recordNames: [domainAlias],
        targetDomain: recordName,
      });
    }
  }

  private createS3Deployment(deployId: string, skipBuild: boolean): void {
    const { path: sitePath, fileOptions, replaceValues } = this.props;
    const buildOutput = this.props.buildOutput || ".";

    // Create custom resource handler
    const handler = new lambda.Function(this, "CustomResourceHandler", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../assets/StaticSite")),
      layers: [new AwsCliLayer(this, "AwsCliLayer")],
      runtime: lambda.Runtime.PYTHON_3_6,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
    });

    const handlerRole = handler.role;
    if (!handlerRole) {
      throw new Error("lambda.SingletonFunction should have created a Role");
    }

    // If build was skipped, the "buildOutput" might not exist. We need to
    // use a source path that is guaranteed to exist (ie. website path)
    let source;
    if (!skipBuild) {
      source = s3Deploy.Source.asset(
        path.join(sitePath, buildOutput)
      ).bind(this, { handlerRole });
    }

    this.s3Bucket.grantReadWrite(handler);

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudfront:GetInvalidation",
          "cloudfront:CreateInvalidation",
        ],
        resources: ["*"],
      })
    );

    // Create custom resource
    new cdk.CustomResource(this, "CustomResource", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        SourceBucketName: source && source.bucket.bucketName,
        SourceObjectKey: source && source.zipObjectKey,
        DestinationBucketName: this.s3Bucket.bucketName,
        DestinationBucketKeyPrefix: deployId,
        DistributionId: this.cfDistribution.distributionId,
        DistributionPaths: ["/*"],
        FileOptions: (fileOptions || []).map(
          ({ exclude, include, cacheControl }) => {
            if (typeof exclude === "string") {
              exclude = [exclude];
            }
            if (typeof include === "string") {
              include = [include];
            }
            const options = [];
            exclude.forEach((per) => options.push("--exclude", per));
            include.forEach((per) => options.push("--include", per));
            options.push("--cache-control", cacheControl);
            return options;
          }
        ),
        ReplaceValues: replaceValues || [],
      },
    });
  }
}
