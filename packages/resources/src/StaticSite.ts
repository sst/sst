import chalk from "chalk";
import path from "path";
import url from "url";
import fs from "fs-extra";
import crypto from "crypto";
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

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  BaseSiteEnvironmentOutputsInfo,
  getBuildCmdEnvironment,
  buildErrorResponsesFor404ErrorPage,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface StaticSiteFileOptions {
  exclude: string | string[];
  include: string | string[];
  cacheControl: string;
}

export interface StaticSiteProps {
  cdk?: {
    /**
     * Allows you to override default settings this construct uses internally to ceate the bucket
     *
     * @example
     * ```js
     * new StaticSite(stack, "Site", {
     *   path: "path/to/src",
     *   cdk: {
     *     bucket: {
     *       bucketName: "mybucket",
     *     },
     *   }
     * });
     * ```
     */
    bucket?: s3.BucketProps | s3.IBucket;
    /**
     * Configure the internally created CDK `Distribution` instance.
     *
     * @example
     * ```js
     * new StaticSite(stack, "Site", {
     *   path: "path/to/src",
     *   cdk: {
     *     distribution: {
     *       comment: "Distribution for my React website",
     *     },
     *   }
     * });
     * ```
     */
    distribution?: StaticSiteCdkDistributionProps;
  };
  /**
   * Path to the directory where the website source is located.
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   path: "path/to/src",
   * });
   * ```
   */
  path: string;
  /**
   * The name of the index page (e.g. "index.html") of the website.
   *
   * @default "index.html"
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   indexPage: "other-index.html",
   * });
   * ```
   */
  indexPage?: string;
  /**
   * The error page behavior for this website. Takes either an HTML page.
   * ```
   * 404.html
   * ```
   * Or the constant `"redirect_to_index_page"` to redirect to the index page.
   *
   * Note that, if the error pages are redirected to the index page, the HTTP status code is set to 200. This is necessary for single page apps, that handle 404 pages on the client side.
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   errorPage: "redirect_to_index_page",
   * });
   * ```
   */
  errorPage?: "redirect_to_index_page" | Omit<string, "redirect_to_index_page">;
  /**
   * The command for building the website
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   buildCommand: "npm run build",
   * });
   * ```
   */
  buildCommand?: string;
  /**
   * The directory with the content that will be uploaded to the S3 bucket. If a `buildCommand` is provided, this is usually where the build output is generated. The path is relative to the [`path`](#path) where the website source is located.
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   buildOutput: "dist",
   * });
   * ```
   */
  buildOutput?: string;
  /**
   * Pass in a list of file options to configure cache control for different files. Behind the scenes, the `StaticSite` construct uses a combination of the `s3 cp` and `s3 sync` commands to upload the website content to the S3 bucket. An `s3 cp` command is run for each file option block, and the options are passed in as the command options.
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   buildOutput: "dist",
   *   fileOptions: {
   *     exclude: "*",
   *     include: "*.js",
   *     cacheControl: "max-age=31536000,public,immutable",
   *   }
   * });
   * ```
   */
  fileOptions?: StaticSiteFileOptions[];
  /**
   * Pass in a list of placeholder values to be replaced in the website content. For example, the follow configuration:
   *
   * @example
   * ```js
   * new StaticSite(stack, "ReactSite", {
   *   replaceValues: [
   *     {
   *       files: "*.js",
   *       search: "{{ API_URL }}",
   *       replace: api.url,
   *     },
   *     {
   *       files: "*.js",
   *       search: "{{ COGNITO_USER_POOL_CLIENT_ID }}",
   *       replace: auth.cognitoUserPoolClient.userPoolClientId,
   *     },
   *   ],
   * });
   * ```
   */
  replaceValues?: StaticSiteReplaceProps[];
  /**
   * The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   path: "path/to/src",
   *   customDomain: "domain.com",
   * });
   * ```
   *
   * @example
   * ```js
   * new StaticSite(stack, "Site", {
   *   path: "path/to/src",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com"
   *   }
   * });
   * ```
   */
  customDomain?: string | StaticSiteDomainProps;
  /**
   * An object with the key being the environment variable name. Note, this requires your build tool to support build time environment variables.
   *
   * @example
   * ```js
   * new StaticSite(stack, "ReactSite", {
   *   environment: {
   *     REACT_APP_API_URL: api.url,
   *     REACT_APP_USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * });
   * ```
   */
  environment?: Record<string, string>;
  /**
   * While deploying, SST removes old files that no longer exist. Pass in `false` to keep the old files around.
   *
   * @default true
   *
   * @example
   * ```js
   * new StaticSite(stack, "ReactSite", {
   *  purge: false
   * });
   * ```
   */
  purgeFiles?: boolean;
  /**
   * When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.
   *
   * @default false
   *
   * @example
   * ```js
   * new StaticSite(stack, "ReactSite", {
   *  disablePlaceholder: true
   * });
   * ```
   */
  disablePlaceholder?: boolean;

  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   *
   * @default true
   *
   * @example
   * ```js
   * new StaticSite(stack, "ReactSite", {
   *  waitForInvalidation: false
   * });
   * ```
   */
  waitForInvalidation?: boolean;
}

export interface StaticSiteDomainProps extends BaseSiteDomainProps {}
export interface StaticSiteReplaceProps extends BaseSiteReplaceProps {}
export interface StaticSiteCdkDistributionProps
  extends BaseSiteCdkDistributionProps {}

/////////////////////
// Construct
/////////////////////

/**
 * The `StaticSite` construct is a higher level CDK construct that makes it easy to create a static website.
 *
 * @example
 *
 * Deploys a plain HTML website in the `path/to/src` directory.
 *
 * ```js
 * import { StaticSite } from "@serverless-stack/resources";
 *
 * new StaticSite(stack, "Site", {
 *   path: "path/to/src",
 * });
 * ```
 */
export class StaticSite extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `Bucket` instance.
     */
    bucket: s3.Bucket;
    /**
     * The internally created CDK `Distribution` instance.
     */
    distribution: cloudfront.Distribution;
    /**
     * The Route 53 hosted zone for the custom domain.
     */
    hostedZone?: route53.IHostedZone;
    /*
     * The AWS Certificate Manager certificate for the custom domain.
     */
    certificate?: acm.ICertificate;
  };
  private props: StaticSiteProps;
  private isPlaceholder: boolean;
  private assets: s3Assets.Asset[];
  private filenamesAsset?: s3Assets.Asset;
  private awsCliLayer: AwsCliLayer;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    const root = scope.node.root as App;
    // Local development or skip build => stub asset
    this.isPlaceholder =
      (root.local || root.skipBuild) && !props.disablePlaceholder;
    const buildDir = root.buildDir;
    const fileSizeLimit = root.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
        props.sstTestFileSizeLimitOverride || 200
      : 200;

    this.props = props;
    this.cdk = {} as any;
    this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
    this.registerSiteEnvironment();

    // Validate input
    this.validateCustomDomainSettings();

    // Build app
    this.buildApp();
    this.assets = this.bundleAssets(fileSizeLimit, buildDir);
    this.filenamesAsset = this.bundleFilenamesAsset(buildDir);

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

  /**
   * The CloudFront URL of the website.
   */
  public get url(): string {
    return `https://${this.cdk.distribution.distributionDomainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the custom domain.
   */
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

  /**
   * The ARN of the internally created S3 Bucket.
   */
  public get bucketArn(): string {
    return this.cdk.bucket.bucketArn;
  }

  /**
   * The name of the internally created S3 Bucket.
   */
  public get bucketName(): string {
    return this.cdk.bucket.bucketName;
  }

  /**
   * The ID of the internally created CloudFront Distribution.
   */
  public get distributionId(): string {
    return this.cdk.distribution.distributionId;
  }

  /**
   * The domain name of the internally created CloudFront Distribution.
   */
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

  private buildApp() {
    if (this.isPlaceholder) {
      return;
    }

    const { path: sitePath, buildCommand } = this.props;

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(
        `No path found at "${path.resolve(sitePath)}" for the "${
          this.node.id
        }" StaticSite.`
      );
    }

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
  }

  private bundleAssets(
    fileSizeLimit: number,
    buildDir: string
  ): s3Assets.Asset[] {
    if (this.isPlaceholder) {
      return [
        new s3Assets.Asset(this, "Asset", {
          path: path.resolve(__dirname, "../assets/StaticSite/stub"),
        }),
      ];
    }

    const { path: sitePath } = this.props;
    const buildOutput = this.props.buildOutput || ".";

    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(sitePath, buildOutput));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" StaticSite.`
      );
    }

    // create zip files
    const script = path.join(__dirname, "../assets/BaseSite/archiver.cjs");
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

  private bundleFilenamesAsset(buildDir: string): s3Assets.Asset | undefined {
    if (this.isPlaceholder) {
      return;
    }
    if (this.props.purgeFiles === false) {
      return;
    }

    const zipPath = path.resolve(
      path.join(buildDir, `StaticSite-${this.node.id}-${this.node.addr}`)
    );

    // create assets
    const filenamesPath = path.join(zipPath, `filenames`);
    if (!fs.existsSync(filenamesPath)) {
      throw new Error(
        `There was a problem generating the "${this.node.id}" StaticSite package.`
      );
    }

    return new s3Assets.Asset(this, `AssetFilenames`, {
      path: filenamesPath,
    });
  }

  private createS3Bucket(): s3.Bucket {
    const { cdk } = this.props;

    // cdk.bucket is an imported construct
    if (cdk?.bucket && isCDKConstruct(cdk?.bucket)) {
      return cdk.bucket as s3.Bucket;
    }
    // cdk.bucket is a prop
    else {
      const bucketProps = cdk?.bucket as s3.BucketProps;
      // Validate s3Bucket
      if (bucketProps?.websiteIndexDocument) {
        throw new Error(
          `Do not configure the "s3Bucket.websiteIndexDocument". Use the "indexPage" to configure the StaticSite index page.`
        );
      }

      if (bucketProps?.websiteErrorDocument) {
        throw new Error(
          `Do not configure the "s3Bucket.websiteErrorDocument". Use the "errorPage" to configure the StaticSite index page.`
        );
      }

      return new s3.Bucket(this, "S3Bucket", {
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
        ...bucketProps,
      });
    }
  }

  private createS3Deployment(): CustomResource {
    const { fileOptions } = this.props;

    // Create a Lambda function that will be doing the uploading
    const uploader = new lambda.Function(this, "S3Uploader", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../assets/BaseSite/custom-resource")
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
        path.join(__dirname, "../assets/BaseSite/custom-resource")
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
    this.filenamesAsset?.grantRead(handler);
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
        Filenames: this.filenamesAsset && {
          BucketName: this.filenamesAsset.s3BucketName,
          ObjectKey: this.filenamesAsset.s3ObjectKey,
        },
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
        path.join(__dirname, "../assets/BaseSite/custom-resource")
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

  private getS3ContentReplaceValues(): StaticSiteReplaceProps[] {
    const replaceValues: StaticSiteReplaceProps[] =
      this.props.replaceValues || [];

    Object.entries(this.props.environment || {})
      .filter(([, value]) => Token.isUnresolved(value))
      .forEach(([key, value]) => {
        const token = `{{ ${key} }}`;
        replaceValues.push(
          {
            files: "**/*.html",
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
