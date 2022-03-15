import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as crypto from "crypto";
import { execSync } from "child_process";

import { Construct } from "constructs";
import {
  Token,
  Duration,
  CfnOutput,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cfOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";

import { App } from "./App";
import { Stack } from "./Stack";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  BaseSiteEnvironmentOutputsInfo,
  getBuildCmdEnvironment,
  buildErrorResponsesFor404ErrorPage,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite";
import { SSTConstruct } from "./Construct";

export interface StaticSiteProps {
  cdk?: {
    bucket?: s3.BucketProps;
    distribution?: BaseSiteCdkDistributionProps;
  };
  path: string;
  indexPage?: string;
  errorPage?: string | "redirect_to_index_page";
  buildCommand?: string;
  buildOutput?: string;
  fileOptions?: {
    exclude: string | string[];
    include: string | string[];
    cacheControl: string;
  }[];
  replaceValues?: BaseSiteReplaceProps[];
  customDomain?: string | BaseSiteDomainProps;
  environment?: { [key: string]: string };
  disablePlaceholder?: boolean;
  waitForInvalidation?: boolean;
}

/////////////////////
// Construct
/////////////////////

export class StaticSite extends Construct implements SSTConstruct {
  public readonly cdk: {
    bucket: s3.Bucket;
    distribution: cloudfront.Distribution;
    hostedZone?: route53.IHostedZone;
    certificate?: acm.ICertificate;
  };
  private props: StaticSiteProps;
  private isPlaceholder: boolean;
  private assets: s3Assets.Asset[];
  private awsCliLayer: AwsCliLayer;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const root = scope.node.root as App;
    // Local development or skip build => stub asset
    this.isPlaceholder =
      (root.local || root.skipBuild) && !props.disablePlaceholder;
    const buildDir = root.buildDir;
    const fileSizeLimit = root.isJestTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "jestFileSizeLimitOverride" not exposed in props
        props.jestFileSizeLimitOverride || 200
      : 200;

    this.props = props;
    this.cdk = {} as any;
    this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
    this.registerSiteEnvironment();

    // Validate input
    this.validateCustomDomainSettings();

    // Build app
    this.assets = this.buildApp(fileSizeLimit, buildDir);

    // Create Bucket
    this.cdk.bucket = this.createS3Bucket();

    // Create Custom Domain
    this.cdk.hostedZone = this.lookupHostedZone();
    this.cdk.certificate = this.createCertificate();

    // Create S3 Deployment
    const s3deployCR = this.createS3Deployment();

    // Create CloudFront
    this.cdk.distribution = this.createCfDistribution();
    this.cdk.distribution.node.addDependency(s3deployCR);

    // Invalidate CloudFront
    const invalidationCR = this.createCloudFrontInvalidation();
    invalidationCR.node.addDependency(this.cdk.distribution);

    // Connect Custom Domain to CloudFront Distribution
    this.createRoute53Records();
  }

  public get url(): string {
    return `https://${this.cdk.distribution.distributionDomainName}`;
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
    return this.cdk.bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.cdk.bucket.bucketName;
  }

  public get distributionId(): string {
    return this.cdk.distribution.distributionId;
  }

  public get distributionDomain(): string {
    return this.cdk.distribution.distributionDomainName;
  }

  public getConstructMetadata() {
    return {
      type: "StaticSite" as const,
      data: {
        distributionId: this.cdk.distribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  private buildApp(fileSizeLimit: number, buildDir: string): s3Assets.Asset[] {
    if (this.isPlaceholder) {
      return [
        new s3Assets.Asset(this, "Asset", {
          path: path.resolve(__dirname, "../../assets/StaticSite/stub"),
        }),
      ];
    }

    const { path: sitePath, buildCommand } = this.props;
    const buildOutput = this.props.buildOutput || ".";

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(
        `No path found at "${path.resolve(sitePath)}" for the "${
          this.node.id
        }" StaticSite.`
      );
    }

    // Build and package user's website

    // build
    if (buildCommand) {
      try {
        console.log(chalk.grey(`Building static site ${sitePath}`));
        execSync(buildCommand, {
          cwd: sitePath,
          stdio: "inherit",
          env: {
            ...process.env,
            ...getBuildCmdEnvironment(this.props.environment),
          },
        });
      } catch (e) {
        throw new Error(
          `There was a problem building the "${this.node.id}" StaticSite.`
        );
      }
    }

    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(sitePath, buildOutput));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" StaticSite.`
      );
    }

    // create zip files
    const script = path.join(__dirname, "../../assets/BaseSite/archiver.js");
    const zipPath = path.resolve(
      path.join(buildDir, `StaticSite-${this.node.id}-${this.node.addr}`)
    );
    // clear zip path to ensure no partX.zip remain from previous build
    fs.removeSync(zipPath);
    const cmd = ["node", script, siteOutputPath, zipPath, fileSizeLimit].join(
      " "
    );

    try {
      execSync(cmd, {
        cwd: sitePath,
        stdio: "inherit",
      });
    } catch (e) {
      throw new Error(
        `There was a problem generating the "${this.node.id}" StaticSite package.`
      );
    }

    // create assets
    const assets = [];
    for (let partId = 0; ; partId++) {
      const zipFilePath = path.join(zipPath, `part${partId}.zip`);
      if (!fs.existsSync(zipFilePath)) {
        break;
      }

      assets.push(
        new s3Assets.Asset(this, `Asset${partId}`, {
          path: zipFilePath,
        })
      );
    }
    return assets;
  }

  private createS3Bucket(): s3.Bucket {
    const { cdk } = this.props;

    // Validate s3Bucket
    if (cdk?.bucket?.websiteIndexDocument) {
      throw new Error(
        `Do not configure the "s3Bucket.websiteIndexDocument". Use the "indexPage" to configure the StaticSite index page.`
      );
    }

    if (cdk?.bucket?.websiteErrorDocument) {
      throw new Error(
        `Do not configure the "s3Bucket.websiteErrorDocument". Use the "errorPage" to configure the StaticSite index page.`
      );
    }

    return new s3.Bucket(this, "S3Bucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      ...cdk?.bucket,
    });
  }

  private createS3Deployment(): CustomResource {
    const { fileOptions } = this.props;

    // Create a Lambda function that will be doing the uploading
    const uploader = new lambda.Function(this, "S3Uploader", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });
    this.cdk.bucket.grantReadWrite(uploader);
    this.assets.forEach((asset) => asset.grantRead(uploader));

    // Create the custom resource function
    const handler = new lambda.Function(this, "S3Handler", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-handler.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
      environment: {
        UPLOADER_FUNCTION_NAME: uploader.functionName,
      },
    });
    this.cdk.bucket.grantReadWrite(handler);
    uploader.grantInvoke(handler);

    // Create custom resource
    return new CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: this.assets.map((asset) => ({
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        })),
        DestinationBucketName: this.cdk.bucket.bucketName,
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
        ReplaceValues: this.getS3ContentReplaceValues(),
      },
    });
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private createCfDistribution(): cloudfront.Distribution {
    const { cdk, customDomain } = this.props;
    const indexPage = this.props.indexPage || "index.html";
    const errorPage = this.props.errorPage;

    // Validate input
    if (cdk?.distribution?.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the StaticSite domain certificate.`
      );
    }
    if (cdk?.distribution?.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the StaticSite domain.`
      );
    }

    // Build domainNames
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

    // Build errorResponses
    let errorResponses;
    // case: sst start => showing stub site, and redirect all routes to the index page
    if (this.isPlaceholder) {
      errorResponses = buildErrorResponsesForRedirectToIndex(indexPage);
    } else if (errorPage) {
      if (cdk?.distribution?.errorResponses) {
        throw new Error(
          `Cannot configure the "cfDistribution.errorResponses" when "errorPage" is passed in. Use one or the other to configure the behavior for error pages.`
        );
      }

      errorResponses =
        errorPage === "redirect_to_index_page"
          ? buildErrorResponsesForRedirectToIndex(indexPage)
          : buildErrorResponsesFor404ErrorPage(errorPage as string);
    }

    // Create CloudFront distribution
    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: indexPage,
      errorResponses,
      ...cdk?.distribution,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.cdk.certificate,
      defaultBehavior: {
        origin: new cfOrigins.S3Origin(this.cdk.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        ...cdk?.distribution?.defaultBehavior,
      },
    });
  }

  private createCloudFrontInvalidation(): CustomResource {
    // Create a Lambda function that will be doing the invalidation
    const invalidator = new lambda.Function(this, "CloudFrontInvalidator", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "cf-invalidate.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });

    // Grant permissions to invalidate CF Distribution
    invalidator.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudfront:GetInvalidation",
          "cloudfront:CreateInvalidation",
        ],
        resources: ["*"],
      })
    );

    // Need the AssetHash field so the CR gets updated on each deploy
    const assetsHash = crypto
      .createHash("md5")
      .update(this.assets.map(({ assetHash }) => assetHash).join(""))
      .digest("hex");

    // Create custom resource
    const waitForInvalidation =
      this.props.waitForInvalidation === false ? false : true;
    return new CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        AssetsHash: assetsHash,
        DistributionId: this.cdk.distribution.distributionId,
        DistributionPaths: ["/*"],
        WaitForInvalidation: waitForInvalidation,
      },
    });
  }

  /////////////////////
  // Custom Domain
  /////////////////////

  protected validateCustomDomainSettings() {
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

  protected lookupHostedZone(): route53.IHostedZone | undefined {
    const { customDomain } = this.props;

    // Skip if customDomain is not configured
    if (!customDomain) {
      return;
    }

    let hostedZone;

    if (typeof customDomain === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain,
      });
    } else if (customDomain.cdk?.hostedZone) {
      hostedZone = customDomain.cdk.hostedZone;
    } else if (typeof customDomain.hostedZone === "string") {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.hostedZone,
      });
    } else if (typeof customDomain.domainName === "string") {
      // Skip if domain is not a Route53 domain
      if (customDomain.isExternalDomain === true) {
        return;
      }

      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: customDomain.domainName,
      });
    } else {
      hostedZone = customDomain.hostedZone;
    }

    return hostedZone;
  }

  private createCertificate(): acm.ICertificate | undefined {
    const { customDomain } = this.props;

    if (!customDomain) {
      return;
    }

    let acmCertificate;

    // HostedZone is set for Route 53 domains
    if (this.cdk.hostedZone) {
      if (typeof customDomain === "string") {
        acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain,
          hostedZone: this.cdk.hostedZone,
          region: "us-east-1",
        });
      } else if (customDomain.cdk?.certificate) {
        acmCertificate = customDomain.cdk.certificate;
      } else {
        acmCertificate = new acm.DnsValidatedCertificate(this, "Certificate", {
          domainName: customDomain.domainName,
          hostedZone: this.cdk.hostedZone,
          region: "us-east-1",
        });
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

  protected createRoute53Records(): void {
    const { customDomain } = this.props;

    if (!customDomain || !this.cdk.hostedZone) {
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
      zone: this.cdk.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(this.cdk.distribution)
      ),
    };
    new route53.ARecord(this, "AliasRecord", recordProps);
    new route53.AaaaRecord(this, "AliasRecordAAAA", recordProps);

    // Create Alias redirect record
    if (domainAlias) {
      new route53Patterns.HttpsRedirect(this, "Redirect", {
        zone: this.cdk.hostedZone,
        recordNames: [domainAlias],
        targetDomain: recordName,
      });
    }
  }

  /////////////////////
  // Helper Functions
  /////////////////////

  private getS3ContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] =
      this.props.replaceValues || [];

    Object.entries(this.props.environment || {})
      .filter(([, value]) => Token.isUnresolved(value))
      .forEach(([key, value]) => {
        const token = `{{ ${key} }}`;
        replaceValues.push(
          {
            files: "index.html",
            search: token,
            replace: value,
          },
          {
            files: "**/*.js",
            search: token,
            replace: value,
          }
        );
      });
    return replaceValues;
  }

  private registerSiteEnvironment() {
    const environmentOutputs: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.props.environment || {})) {
      const outputId = `SstSiteEnv_${key}`;
      const output = new CfnOutput(this, outputId, { value });
      environmentOutputs[key] = Stack.of(this).getLogicalId(output);
    }

    const root = this.node.root as App;
    root.registerSiteEnvironment({
      id: this.node.id,
      path: this.props.path,
      stack: Stack.of(this).node.id,
      environmentOutputs,
    } as BaseSiteEnvironmentOutputsInfo);
  }
}
