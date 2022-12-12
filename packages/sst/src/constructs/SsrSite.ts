import path from "path";
import url from "url";
import fs from "fs";
import glob from "glob";
import crypto from "crypto";
import spawn from "cross-spawn";
import { execSync } from "child_process";

import { Construct } from "constructs";
import {
  Fn,
  Duration,
  CfnOutput,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Logger } from "../logger.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";
import { EdgeFunction } from "./EdgeFunction.js";
import {
  BaseSiteDomainProps,
  getBuildCmdEnvironment,
  BaseSiteCdkDistributionProps,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import {
  ENVIRONMENT_PLACEHOLDER,
  FunctionBindingProps,
  getParameterPath,
} from "./util/functionBinding.js";
import { SiteEnv } from "../site-env.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export type SsrBuildConfig = {
  buildCommand?: string;
  serverBuildOutputFile: string;
  clientBuildOutputDir: string;
  clientBuildVersionedSubDir: string;
  siteStub: string;
};

export interface SsrDomainProps extends BaseSiteDomainProps { }
export interface SsrCdkDistributionProps extends BaseSiteCdkDistributionProps { }
export interface SsrSiteProps {
  /**
   * The SSR function is deployed to Lambda in a single region. Alternatively, you can enable this option to deploy to Lambda@Edge.
   * @default false
   */
  edge?: boolean;

  /**
   * Path to the directory where the app is located.
   */
  path: string;

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
  customDomain?: string | SsrDomainProps;

  /**
   * An object with the key being the environment variable name.
   *
   * @example
   * ```js
   * environment: {
   *   API_URL: api.url,
   *   USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   * },
   * ```
   */
  environment?: Record<string, string>;

  /**
   * When running `sst start`, a placeholder site is deployed. This is to ensure
   * that the site content remains unchanged, and subsequent `sst start` can
   * start up quickly.
   *
   * @example
   * ```js
   * disablePlaceholder: true,
   * ```
   */
  disablePlaceholder?: boolean;

  defaults?: {
    function?: {
      timeout?: number;
      memorySize?: number;
      permissions?: Permissions;
    };
  };

  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   */
  waitForInvalidation?: boolean;

  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Allows you to override default settings this construct uses internally to ceate the bucket
     */
    bucket?: s3.BucketProps | s3.IBucket;
    /**
     * Pass in a value to override the default settings this construct uses to
     * create the CDK `Distribution` internally.
     */
    distribution?: SsrCdkDistributionProps;
    /**
     * Override the default CloudFront cache policies created internally.
     */
    cachePolicies?: {
      /**
       * Override the CloudFront cache policy properties for browser build files.
       */
      buildCachePolicy?: cloudfront.ICachePolicy;
      /**
       * Override the CloudFront cache policy properties for "public" folder
       * static files.
       *
       * Note: This will not include the browser build files, which have a seperate
       * cache policy; @see `buildCachePolicy`.
       */
      staticsCachePolicy?: cloudfront.ICachePolicy;
      /**
       * Override the CloudFront cache policy properties for responses from the
       * server rendering Lambda.
       *
       * @note The default cache policy that is used in the abscene of this property
       * is one that performs no caching of the server response.
       */
      serverCachePolicy?: cloudfront.ICachePolicy;
    };
  };
}

/**
 * The `SsrSite` construct is a higher level CDK construct that makes it easy to create modern web apps with Server Side Rendering capabilities.
 * @example
 * Deploys an Astro app in the `web` directory.
 *
 * ```js
 * new SsrSite(stack, "site", {
 *   path: "web",
 * });
 * ```
 */
export class SsrSite extends Construct implements SSTConstruct {
  public readonly id: string;
  /**
   * The default CloudFront cache policy properties for browser build files.
   */
  public static buildCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    // The browser build file names all contain unique hashes based on their
    // content, we can therefore aggressively cache them as we shouldn't hit
    // unexpected collisions.
    defaultTtl: Duration.days(365),
    maxTtl: Duration.days(365),
    minTtl: Duration.days(365),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST browser build files cache policy",
  };

  /**
   * The default CloudFront cache policy properties for static files.
   *
   * @note This policy is not applied to the browser build files; they have a seperate
   * cache policy; @see `buildCachePolicyProps`.
   */
  public static staticsCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: Duration.days(0),
    maxTtl: Duration.days(365),
    minTtl: Duration.days(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST static files cache policy",
  };

  /**
   * The default CloudFront cache policy properties for responses from the
   * server rendering Lambda.
   *
   * @note By default no caching is performed on the server rendering Lambda response.
   */
  public static serverCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    defaultTtl: Duration.days(0),
    maxTtl: Duration.days(365),
    minTtl: Duration.days(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST server response cache policy",
  };

  /**
   * Exposes CDK instances created within the construct.
   */
  public readonly cdk: {
    /**
     * The internally created CDK `Function` instance. Not available in the "edge" mode.
     */
    function?: lambda.Function;
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
    /**
     * The AWS Certificate Manager certificate for the custom domain.
     */
    certificate?: acm.ICertificate;
  };
  protected props: SsrSiteProps;
  /**
   * Determines if a placeholder site should be deployed instead. We will set
   * this to `true` by default when performing local development, although the
   * user can choose to override this value.
   */
  protected isPlaceholder: boolean;
  /**
   * The root SST directory used for builds.
   */
  protected sstBuildDir: string;
  protected buildConfig: SsrBuildConfig;
  private serverLambdaForEdge?: EdgeFunction;
  protected serverLambdaForRegional?: lambda.Function;
  private awsCliLayer: AwsCliLayer;

  constructor(scope: Construct, id: string, props: SsrSiteProps) {
    super(scope, props.cdk?.id || id);

    this.id = id;
    const app = scope.node.root as App;
    this.isPlaceholder =
      (app.local || app.skipBuild) && !props.disablePlaceholder;
    this.sstBuildDir = app.buildDir;
    this.props = props;
    this.cdk = {} as any;
    this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
    this.validateSiteExists();
    this.registerSiteEnvironment();
    this.buildConfig = this.initBuildConfig();

    // Prepare app
    if (!this.isPlaceholder) {
      this.buildApp();
    }

    // Create Bucket which will be utilised to contain the statics
    this.cdk.bucket = this.createS3Bucket();

    // Create Server functions
    if (props.edge) {
      this.serverLambdaForEdge = this.createFunctionForEdge();
      this.createFunctionPermissionsForEdge();
    } else {
      this.serverLambdaForRegional = this.createFunctionForRegional();
      this.createFunctionPermissionsForRegional();
      this.cdk.function = this.serverLambdaForRegional;
    }

    // Create Custom Domain
    this.validateCustomDomainSettings();
    this.cdk.hostedZone = this.lookupHostedZone();
    this.cdk.certificate = this.createCertificate();

    // Create S3 Deployment
    const assets = this.isPlaceholder
      ? this.createStaticsS3AssetsWithStub()
      : this.createStaticsS3Assets();
    const s3deployCR = this.createS3Deployment(assets);

    // Create CloudFront
    this.validateCloudFrontDistributionSettings();
    if (props.edge) {
      this.cdk.distribution = this.isPlaceholder
        ? this.createCloudFrontDistributionForStub()
        : this.createCloudFrontDistributionForEdge();
    } else {
      this.cdk.distribution = this.isPlaceholder
        ? this.createCloudFrontDistributionForStub()
        : this.createCloudFrontDistributionForRegional();
    }
    this.cdk.distribution.node.addDependency(s3deployCR);

    // Invalidate CloudFront
    const invalidationCR = this.createCloudFrontInvalidation();
    invalidationCR.node.addDependency(this.cdk.distribution);

    // Connect Custom Domain to CloudFront Distribution
    this.createRoute53Records();
  }

  /////////////////////
  // Public Properties
  /////////////////////

  /**
   * The CloudFront URL of the website.
   */
  public get url(): string {
    return `https://${this.cdk.distribution.distributionDomainName}`;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
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

  /////////////////////
  // Public Methods
  /////////////////////

  /**
   * Attaches the given list of permissions to allow the Astro server side
   * rendering to access other AWS resources.
   *
   * @example
   * ```js
   * site.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    if (this.serverLambdaForRegional) {
      attachPermissionsToRole(
        this.serverLambdaForRegional.role as iam.Role,
        permissions
      );
    }

    this.serverLambdaForEdge?.attachPermissions(permissions);
  }

  /** @internal */
  public getConstructMetadata() {
    return {
      type: "SsrSite" as const,
      data: {
        distributionId: this.cdk.distribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    const app = this.node.root as App;
    return {
      clientPackage: "site",
      variables: {
        url: {
          // Do not set real value b/c we don't want to make the Lambda function
          // depend on the Site. B/c often the site depends on the Api, causing
          // a CloudFormation circular dependency if the Api and the Site belong
          // to different stacks.
          environment: ENVIRONMENT_PLACEHOLDER,
          parameter: this.customDomainUrl || this.url,
        },
      },
      permissions: {
        "ssm:GetParameters": [
          `arn:aws:ssm:${app.region}:${app.account}:parameter${getParameterPath(
            this,
            "url"
          )}`,
        ],
      },
    };
  }

  /////////////////////
  // Build App
  /////////////////////

  protected initBuildConfig(): SsrBuildConfig {
    return {
      serverBuildOutputFile: "placeholder",
      clientBuildOutputDir: "placeholder",
      clientBuildVersionedSubDir: "placeholder",
      siteStub: "placeholder",
    };
  }

  private buildApp() {
    const app = this.node.root as App;
    if (!app.isRunningSSTTest()) {
      this.runBuild();
    }
    this.validateBuildOutput();
  }

  protected validateBuildOutput() {
    const serverBuildFile = path.join(
      this.props.path,
      this.buildConfig.serverBuildOutputFile
    );
    if (!fs.existsSync(serverBuildFile)) {
      throw new Error(`No server build output found at "${serverBuildFile}"`);
    }
  }

  private runBuild() {
    const defaultCommand = "npm run build";
    const buildCommand = this.buildConfig.buildCommand || defaultCommand;
    const { path: sitePath, environment } = this.props;

    if (buildCommand === defaultCommand) {
      // Ensure that the site has a build script defined
      if (!fs.existsSync(path.join(sitePath, "package.json"))) {
        throw new Error(`No package.json found at "${sitePath}".`);
      }
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(sitePath, "package.json")).toString()
      );
      if (!packageJson.scripts || !packageJson.scripts.build) {
        throw new Error(
          `No "build" script found within package.json in "${sitePath}".`
        );
      }
    }

    // Run build
    Logger.debug(`Running "${buildCommand}" script`);
    try {
      execSync(buildCommand, {
        cwd: sitePath,
        stdio: "inherit",
        env: {
          ...process.env,
          ...getBuildCmdEnvironment(environment),
        },
      });
    } catch (e) {
      throw new Error(
        `There was a problem building the "${this.node.id}" StaticSite.`
      );
    }
  }

  /////////////////////
  // Bundle S3 Assets
  /////////////////////

  private createStaticsS3Assets(): s3Assets.Asset[] {
    const app = this.node.root as App;
    const fileSizeLimit = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
      this.props.sstTestFileSizeLimitOverride || 200
      : 200;

    // First we need to create zip files containing the statics
    const script = path.resolve(__dirname, "../support/base-site-archiver.cjs");
    const zipOutDir = path.resolve(
      path.join(this.sstBuildDir, `Site-${this.node.id}-${this.node.addr}`)
    );
    // Remove zip dir to ensure no partX.zip remain from previous build
    fs.rmSync(zipOutDir, { recursive: true, force: true });

    const result = spawn.sync(
      "node",
      [
        script,
        path.join(this.props.path, this.buildConfig.clientBuildOutputDir),
        zipOutDir,
        `${fileSizeLimit}`,
      ],
      {
        stdio: "inherit",
      }
    );
    if (result.status !== 0) {
      throw new Error(`There was a problem generating the assets package.`);
    }

    // Create S3 Assets for each zip file
    const assets = [];
    for (let partId = 0; ; partId++) {
      const zipFilePath = path.join(zipOutDir, `part${partId}.zip`);
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

  private createStaticsS3AssetsWithStub(): s3Assets.Asset[] {
    return [
      new s3Assets.Asset(this, "Asset", {
        path: this.buildConfig.siteStub,
      }),
    ];
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
      return new s3.Bucket(this, "S3Bucket", {
        publicReadAccess: true,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
        ...bucketProps,
      });
    }
  }

  private createS3Deployment(assets: s3Assets.Asset[]): CustomResource {
    // Create a Lambda function that will be doing the uploading
    const uploader = new lambda.Function(this, "S3Uploader", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });
    this.cdk.bucket.grantReadWrite(uploader);
    assets.forEach((asset) => asset.grantRead(uploader));

    // Create the custom resource function
    const handler = new lambda.Function(this, "S3Handler", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
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

    // Build file options
    const fileOptions = [];
    const clientPath = path.join(
      this.props.path,
      this.buildConfig.clientBuildOutputDir
    );
    for (const item of fs.readdirSync(clientPath)) {
      if (item === this.buildConfig.clientBuildVersionedSubDir) {
        fileOptions.push({
          exclude: "*",
          include: `${this.buildConfig.clientBuildVersionedSubDir}/*`,
          cacheControl: "public,max-age=31536000,immutable",
        });
      } else {
        const itemPath = path.join(clientPath, item);
        fileOptions.push({
          exclude: "*",
          include: fs.statSync(itemPath).isDirectory()
            ? `${item}/*`
            : `${item}`,
          cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
        });
      }
    }

    // Create custom resource
    return new CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: assets.map((asset) => ({
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        })),
        DestinationBucketName: this.cdk.bucket.bucketName,
        FileOptions: (fileOptions || []).map(
          ({ exclude, include, cacheControl }) => {
            return [
              "--exclude",
              exclude,
              "--include",
              include,
              "--cache-control",
              cacheControl,
            ];
          }
        ),
      },
    });
  }

  /////////////////////
  // Bundle Lambda Server
  /////////////////////

  protected createFunctionForRegional(): lambda.Function {
    return {} as lambda.Function;
  }

  protected createFunctionForEdge(): EdgeFunction {
    return {} as EdgeFunction;
  }

  private createFunctionPermissionsForRegional() {
    const { defaults } = this.props;

    this.cdk.bucket.grantReadWrite(this.serverLambdaForRegional!.role!);
    if (defaults?.function?.permissions) {
      attachPermissionsToRole(
        this.serverLambdaForRegional!.role as iam.Role,
        defaults.function.permissions
      );
    }
  }

  private createFunctionPermissionsForEdge() {
    this.cdk.bucket.grantReadWrite(this.serverLambdaForEdge!.role);
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private validateCloudFrontDistributionSettings() {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    if (cfDistributionProps.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the domain certificate.`
      );
    }
    if (cfDistributionProps.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the domain name.`
      );
    }
  }

  protected createCloudFrontDistributionForRegional(): cloudfront.Distribution {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new origins.S3Origin(this.cdk.bucket);

    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk.certificate,
      defaultBehavior: this.buildDistributionDefaultBehaviorForRegional(),
      additionalBehaviors: {
        ...this.buildDistributionStaticBehaviors(s3Origin),
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private createCloudFrontDistributionForEdge(): cloudfront.Distribution {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const s3Origin = new origins.S3Origin(this.cdk.bucket);

    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk.certificate,
      defaultBehavior: this.buildDistributionDefaultBehaviorForEdge(s3Origin),
      additionalBehaviors: {
        ...this.buildDistributionStaticBehaviors(s3Origin),
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private createCloudFrontDistributionForStub(): cloudfront.Distribution {
    return new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      errorResponses: buildErrorResponsesForRedirectToIndex("index.html"),
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk.certificate,
      defaultBehavior: {
        origin: new origins.S3Origin(this.cdk.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });
  }

  protected buildDistributionDomainNames(): string[] {
    const { customDomain } = this.props;
    const domainNames = [];
    if (!customDomain) {
      // no domain
    } else if (typeof customDomain === "string") {
      domainNames.push(customDomain);
    } else {
      domainNames.push(customDomain.domainName);
    }
    return domainNames;
  }

  private buildDistributionDefaultBehaviorForRegional(): cloudfront.BehaviorOptions {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    const fnUrl = this.serverLambdaForRegional!.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const serverCachePolicy =
      cdk?.cachePolicies?.serverCachePolicy ??
      this.createCloudFrontServerCachePolicy();

    return {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new origins.HttpOrigin(Fn.parseDomainName(fnUrl.url)),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: serverCachePolicy,
      ...(cfDistributionProps.defaultBehavior || {}),
    };
  }

  private buildDistributionDefaultBehaviorForEdge(
    origin: origins.S3Origin
  ): cloudfront.BehaviorOptions {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    const serverCachePolicy =
      cdk?.cachePolicies?.serverCachePolicy ??
      this.createCloudFrontServerCachePolicy();

    return {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: serverCachePolicy,
      ...(cfDistributionProps.defaultBehavior || {}),
      // concatenate edgeLambdas
      edgeLambdas: [
        {
          includeBody: true,
          eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion: this.serverLambdaForEdge!.currentVersion,
        },
        ...(cfDistributionProps.defaultBehavior?.edgeLambdas || []),
      ],
    };
  }

  protected buildDistributionStaticBehaviors(
    origin: origins.S3Origin
  ): Record<string, cloudfront.BehaviorOptions> {
    const { cdk } = this.props;

    // Build cache policies
    const buildCachePolicy =
      cdk?.cachePolicies?.buildCachePolicy ??
      this.createCloudFrontBuildAssetsCachePolicy();
    const staticsCachePolicy =
      cdk?.cachePolicies?.staticsCachePolicy ??
      this.createCloudFrontStaticsCachePolicy();

    // Create additional behaviours for statics
    const staticsBehaviours: Record<string, cloudfront.BehaviorOptions> = {};
    const staticBehaviourOptions: cloudfront.BehaviorOptions = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: staticsCachePolicy,
    };

    // Add behaviour for browser build
    staticsBehaviours[`${this.buildConfig.clientBuildVersionedSubDir}/*`] = {
      ...staticBehaviourOptions,
      cachePolicy: buildCachePolicy,
    };

    // Add behaviour for public folder statics (excluding build)
    const publicDir = path.join(
      this.props.path,
      this.buildConfig.clientBuildOutputDir
    );
    for (const item of fs.readdirSync(publicDir)) {
      if (item === this.buildConfig.clientBuildVersionedSubDir) {
        continue;
      }
      const itemPath = path.join(publicDir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        staticsBehaviours[`${item}/*`] = staticBehaviourOptions;
      } else {
        staticsBehaviours[item] = staticBehaviourOptions;
      }
    }

    return staticsBehaviours;
  }

  protected createCloudFrontBuildAssetsCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "BuildCache",
      SsrSite.buildCachePolicyProps
    );
  }

  protected createCloudFrontStaticsCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "StaticsCache",
      SsrSite.staticsCachePolicyProps
    );
  }

  protected createCloudFrontServerCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "ServerCache",
      SsrSite.serverCachePolicyProps
    );
  }

  private createCloudFrontInvalidation(): CustomResource {
    // Create a Lambda function that will be doing the invalidation
    const invalidator = new lambda.Function(this, "CloudFrontInvalidator", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
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

    const waitForInvalidation = this.isPlaceholder
      ? false
      : this.props.waitForInvalidation === false
        ? false
        : true;
    return new CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        BuildId: this.isPlaceholder ? "live" : this.generateBuildId(),
        DistributionId: this.cdk.distribution.distributionId,
        // TODO: Ignore the browser build path as it may speed up invalidation
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

  private validateSiteExists() {
    const { path: sitePath } = this.props;
    if (!fs.existsSync(sitePath)) {
      throw new Error(`No site found at "${path.resolve(sitePath)}"`);
    }
  }

  private registerSiteEnvironment() {
    for (const [key, value] of Object.entries(this.props.environment || {})) {
      const outputId = `SstSiteEnv_${key}`;
      const output = new CfnOutput(this, outputId, { value });
      SiteEnv.append({
        path: this.props.path,
        output: Stack.of(this).getLogicalId(output),
        environment: key,
        stack: Stack.of(this).stackName,
      });
    }
  }

  protected generateBuildId(): string {
    // We will generate a hash based on the contents of the "public" folder
    // which will be used to indicate if we need to invalidate our CloudFront
    // cache. As the browser build files are always uniquely hash in their
    // filenames according to their content we can ignore the browser build
    // files.

    // The below options are needed to support following symlinks when building zip files:
    // - nodir: This will prevent symlinks themselves from being copied into the zip.
    // - follow: This will follow symlinks and copy the files within.
    const globOptions = {
      dot: true,
      nodir: true,
      follow: true,
      ignore: [`${this.buildConfig.clientBuildVersionedSubDir}/**`],
      cwd: path.resolve(this.props.path, this.buildConfig.clientBuildOutputDir),
    };
    const files = glob.sync("**", globOptions);
    const hash = crypto.createHash("sha1");
    for (const file of files) {
      hash.update(file);
    }
    const buildId = hash.digest("hex");

    Logger.debug(`Generated build ID ${buildId}`);

    return buildId;
  }
}
