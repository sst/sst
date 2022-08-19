import chalk from "chalk";
import path from "path";
import url from "url";
import fs from "fs-extra";
import spawn from "cross-spawn";
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
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import type { RoutesManifest } from "@sls-next/lambda-at-edge";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  BaseSiteEnvironmentOutputsInfo,
  getBuildCmdEnvironment,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { getHandlerHash } from "./util/builder.js";
import * as crossRegionHelper from "./nextjs-site/cross-region-helper.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export interface NextjsDomainProps extends BaseSiteDomainProps {}
export interface NextjsCdkDistributionProps
  extends BaseSiteCdkDistributionProps {}
export interface NextjsSiteProps {
  cdk?: {
    /**
     * Allows you to override default settings this construct uses internally to ceate the bucket
     */
    bucket?: s3.BucketProps | s3.IBucket;
    /**
     * Pass in a value to override the default settings this construct uses to create the CDK `Distribution` internally.
     */
    distribution?: NextjsCdkDistributionProps;
    /**
     * Override the default CloudFront cache policies created internally.
     */
    cachePolicies?: {
      staticCachePolicy?: cloudfront.ICachePolicy;
      imageCachePolicy?: cloudfront.ICachePolicy;
      lambdaCachePolicy?: cloudfront.ICachePolicy;
    };
    /**
     * Override the default CloudFront image origin request policy created internally
     */
    imageOriginRequestPolicy?: cloudfront.IOriginRequestPolicy;
    /**
     * Override the default settings this construct uses to create the CDK `Queue` internally.
     */
    regenerationQueue?: sqs.QueueProps;
  };
  /**
   * Path to the directory where the website source is located.
   */
  path: string;
  /**
   * Path to the next executable, typically in node_modules.
   * This should be used if next is installed in a non-standard location.
   * 
   * @default "./node_modules/.bin/next"
   */
  nextBinPath?: string;
  /**
   * The customDomain for this website. SST supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
   *
   * Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
   *
   * @example
   * ```js {3}
   * new NextjsSite(stack, "Site", {
   *   path: "path/to/site",
   *   customDomain: "domain.com",
   * });
   * ```
   *
   * ```js {3-6}
   * new NextjsSite(stack, "Site", {
   *   path: "path/to/site",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com"
   *   },
   * });
   * ```
   */
  customDomain?: string | NextjsDomainProps;
  /**
   * An object with the key being the environment variable name.
   *
   * @example
   * ```js {3-6}
   * new NextjsSite(stack, "NextSite", {
   *   path: "path/to/site",
   *   environment: {
   *     API_URL: api.url,
   *     USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * });
   * ```
   */
  environment?: { [key: string]: string };
  defaults?: {
    function?: {
      timeout?: number;
      memorySize?: number;
      permissions?: Permissions;
      /**
       * The runtime environment.
       * @default "nodejs16.x"
       * @example
       * ```js
       * new Function(stack, "Function", {
       *   path: "path/to/site",
       *   runtime: "nodejs16.x",
       * })
       *```
      */
      runtime?: "nodejs12.x" | "nodejs14.x" | "nodejs16.x";
    };
  };
  /**
   * When running `sst start`, a placeholder site is deployed. This is to ensure that the site content remains unchanged, and subsequent `sst start` can start up quickly.
   *
   * @example
   * ```js {3}
   * new NextjsSite(stack, "NextSite", {
   *   path: "path/to/site",
   *   disablePlaceholder: true,
   * });
   * ```
   */
  disablePlaceholder?: boolean;
  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   */
  waitForInvalidation?: boolean;
  commandHooks?: {
    /**
     * Commands to run after building the Next.js app. Commands are chained with `&&`, and they are run inside the Next.js app folder.
     *
     * @example
     * ```js
     * new NextjsSite(stack, "NextSite", {
     *   path: "path/to/site",
     *   commandHooks: {
     *     afterBuild: ["npx next-sitemap"],
     *   }
     * });
     * ```
     */
    afterBuild?: string[];
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Next.js app.
 *
 * @example
 *
 * Deploys a Next.js app in the `path/to/site` directory.
 *
 * ```js
 * new NextjsSite(stack, "NextSite", {
 *   path: "path/to/site",
 * });
 * ```
 */
export class NextjsSite extends Construct implements SSTConstruct {
  /**
   * The default CloudFront cache policy properties for static pages.
   */
  public static staticCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: Duration.days(30),
    maxTtl: Duration.days(30),
    minTtl: Duration.days(30),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST NextjsSite Static Default Cache Policy",
  };

  /**
   * The default CloudFront cache policy properties for images.
   */
  public static imageCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    headerBehavior: cloudfront.CacheHeaderBehavior.allowList("Accept"),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: Duration.days(1),
    maxTtl: Duration.days(365),
    minTtl: Duration.days(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST NextjsSite Image Default Cache Policy",
  };

  /**
   * The default CloudFront cache policy properties for Lambda@Edge.
   */
  public static lambdaCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    defaultTtl: Duration.seconds(0),
    maxTtl: Duration.days(365),
    minTtl: Duration.seconds(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST NextjsSite Lambda Default Cache Policy",
  };

  /**
   * The default CloudFront image origin request policy properties for Lambda@Edge.
   */
  public static imageOriginRequestPolicyProps: cloudfront.OriginRequestPolicyProps =
    {
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      comment: "SST NextjsSite Lambda Default Origin Request Policy",
    };

  public readonly cdk: {
    /**
     * The internally created CDK `Bucket` instance.
     */
    bucket: s3.Bucket;
    /**
     * The internally created CDK `Queue` instance.
     */
    regenerationQueue: sqs.Queue;
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
  private props: NextjsSiteProps;
  private isPlaceholder: boolean;
  private buildOutDir: string | null;
  private assets: s3Assets.Asset[];
  private awsCliLayer: AwsCliLayer;
  private routesManifest: RoutesManifest | null;
  private edgeLambdaRole: iam.Role;
  private mainFunctionVersion: lambda.IVersion;
  private apiFunctionVersion: lambda.IVersion;
  private imageFunctionVersion: lambda.IVersion;
  private regenerationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: NextjsSiteProps) {
    super(scope, id);

    const app = scope.node.root as App;
    // Local development or skip build => stub asset
    this.isPlaceholder =
      (app.local || app.skipBuild) && !props.disablePlaceholder;
    const buildDir = app.buildDir;
    const fileSizeLimit = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
        props.sstTestFileSizeLimitOverride || 200
      : 200;

    this.props = props;
    this.cdk = {} as any;
    this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
    this.registerSiteEnvironment();

    // Build app
    if (this.isPlaceholder) {
      this.buildOutDir = null;
      this.assets = this.zipAppStubAssets();
      this.routesManifest = null;
    } else {
      this.buildOutDir = this.buildApp();
      this.assets = this.zipAppAssets(fileSizeLimit, buildDir);
      this.routesManifest = this.readRoutesManifest();
    }

    // Create Bucket
    this.cdk.bucket = this.createS3Bucket();

    // Handle Incremental Static Regeneration
    this.cdk.regenerationQueue = this.createRegenerationQueue();
    this.regenerationFunction = this.createRegenerationFunction();

    // Create Lambda@Edge functions (always created in us-east-1)
    this.edgeLambdaRole = this.createEdgeFunctionRole();
    this.mainFunctionVersion = this.createEdgeFunction(
      "Main",
      "default-lambda"
    );
    this.apiFunctionVersion = this.createEdgeFunction("Api", "api-lambda");
    this.imageFunctionVersion = this.createEdgeFunction(
      "Image",
      "image-lambda"
    );

    // Create Custom Domain
    this.validateCustomDomainSettings();
    this.cdk.hostedZone = this.lookupHostedZone();
    this.cdk.certificate = this.createCertificate();

    // Create S3 Deployment
    const s3deployCR = this.createS3Deployment();

    // Create CloudFront
    this.cdk.distribution = this.createCloudFrontDistribution();
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

  /**
   * Attaches the given list of permissions to allow the Next.js API routes and Server Side rendering `getServerSideProps` to access other AWS resources.
   * @example
   * ### Attaching permissions
   *
   * ```js {5}
   * const site = new NextjsSite(stack, "Site", {
   *   path: "path/to/site",
   * });
   *
   * site.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    attachPermissionsToRole(this.edgeLambdaRole, permissions);
  }

  public getConstructMetadata() {
    return {
      type: "NextSite" as const,
      data: {
        distributionId: this.cdk.distribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  private zipAppAssets(
    fileSizeLimit: number,
    buildDir: string
  ): s3Assets.Asset[] {
    // validate buildOutput exists
    const siteOutputPath = path.resolve(path.join(this.buildOutDir!, "assets"));
    if (!fs.existsSync(siteOutputPath)) {
      throw new Error(
        `No build output found at "${siteOutputPath}" for the "${this.node.id}" NextjsSite.`
      );
    }

    // create zip files
    const script = path.join(__dirname, "../assets/BaseSite/archiver.cjs");
    const zipPath = path.resolve(
      path.join(buildDir, `NextjsSite-${this.node.id}-${this.node.addr}`)
    );
    // clear zip path to ensure no partX.zip remain from previous build
    fs.removeSync(zipPath);

    const result = spawn.sync(
      "node",
      [script, siteOutputPath, zipPath, `${fileSizeLimit}`],
      {
        stdio: "inherit",
      }
    );
    if (result.status !== 0) {
      console.error(
        `There was a problem generating the "${this.node.id}" NextjsSite package.`
      );
      process.exit(1);
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

  private zipAppStubAssets(): s3Assets.Asset[] {
    return [
      new s3Assets.Asset(this, "Asset", {
        path: path.resolve(__dirname, "../assets/NextjsSite/site-stub"),
      }),
    ];
  }

  private createEdgeFunction(
    name: string,
    handlerPath: string
  ): lambda.IVersion {
    // Use real code if:
    // - Next.js app was build; AND
    // - the Lambda code directory is not empty
    const hasRealCode =
      typeof this.buildOutDir === "string" &&
      fs.pathExistsSync(path.join(this.buildOutDir, handlerPath, "index.js"));

    // Create function asset
    const assetPath =
      hasRealCode && this.buildOutDir
        ? path.join(this.buildOutDir, handlerPath)
        : path.join(__dirname, "../assets/NextjsSite/edge-lambda-stub");
    const asset = new s3Assets.Asset(this, `${name}FunctionAsset`, {
      path: assetPath,
    });

    // Create function based on region
    const app = this.node.root as App;
    return app.region === "us-east-1"
      ? this.createEdgeFunctionInUE1(name, assetPath, asset, hasRealCode)
      : this.createEdgeFunctionInNonUE1(name, assetPath, asset, hasRealCode);
  }

  private createEdgeFunctionInUE1(
    name: string,
    assetPath: string,
    asset: s3Assets.Asset,
    hasRealCode: boolean
  ): lambda.IVersion {
    const { defaults } = this.props;

    // Create function
    const fn = new lambda.Function(this, `${name}Function`, {
      description: `${name} handler for Next.js`,
      handler: "index-wrapper.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(assetPath),
      runtime: this.normalizeRuntime(defaults?.function?.runtime),
      memorySize: defaults?.function?.memorySize || 512,
      timeout: Duration.seconds(defaults?.function?.timeout || 10),
      role: this.edgeLambdaRole,
    });

    // Create alias
    fn.currentVersion.addAlias("live");

    // Deploy after the code is updated
    if (hasRealCode) {
      const updaterCR = this.createLambdaCodeReplacer(name, asset);
      fn.node.addDependency(updaterCR);
    }

    return fn.currentVersion;
  }

  private createEdgeFunctionInNonUE1(
    name: string,
    assetPath: string,
    asset: s3Assets.Asset,
    hasRealCode: boolean
  ): lambda.IVersion {
    const { defaults } = this.props;

    // If app region is NOT us-east-1, create a Function in us-east-1
    // using a Custom Resource

    // Create a S3 bucket in us-east-1 to store Lambda code. Create
    // 1 bucket for all Edge functions.
    const bucketCR = crossRegionHelper.getOrCreateBucket(this);
    const bucketName = bucketCR.getAttString("BucketName");

    // Create a Lambda function in us-east-1
    const functionCR = crossRegionHelper.createFunction(
      this,
      name,
      this.edgeLambdaRole,
      bucketName,
      {
        Description: `handler for Next.js`,
        Handler: "index-wrapper.handler",
        Code: {
          S3Bucket: asset.s3BucketName,
          S3Key: asset.s3ObjectKey,
        },
        Runtime: this.normalizeRuntime(defaults?.function?.runtime).name,
        MemorySize: defaults?.function?.memorySize || 512,
        Timeout: Duration.seconds(
          defaults?.function?.timeout || 10
        ).toSeconds(),
        Role: this.edgeLambdaRole.roleArn,
      }
    );
    const functionArn = functionCR.getAttString("FunctionArn");

    // Create a Lambda function version in us-east-1
    const versionCR = crossRegionHelper.createVersion(this, name, functionArn);
    const versionId = versionCR.getAttString("Version");
    crossRegionHelper.updateVersionLogicalId(functionCR, versionCR);

    // Deploy after the code is updated
    if (hasRealCode) {
      const updaterCR = this.createLambdaCodeReplacer(name, asset);
      functionCR.node.addDependency(updaterCR);
    }

    return lambda.Version.fromVersionArn(
      this,
      `${name}FunctionVersion`,
      `${functionArn}:${versionId}`
    );
  }

  private createEdgeFunctionRole(): iam.Role {
    const { defaults } = this.props;

    // Create function role
    const role = new iam.Role(this, `EdgeLambdaRole`, {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("edgelambda.amazonaws.com")
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          "EdgeLambdaPolicy",
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Attach permission
    this.cdk.bucket.grantReadWrite(role);
    this.cdk.regenerationQueue.grantSendMessages(role);
    this.regenerationFunction.grantInvoke(role);
    if (defaults?.function?.permissions) {
      attachPermissionsToRole(role, defaults.function.permissions);
    }

    return role;
  }

  private createRegenerationQueue(): sqs.Queue {
    const { cdk } = this.props;

    return new sqs.Queue(this, "RegenerationQueue", {
      ...cdk?.regenerationQueue,
      // We call the queue the same name as the bucket so that we can easily
      // reference it from within the lambda@edge, given we can't use env vars
      // in a lambda@edge
      queueName: `${this.cdk.bucket.bucketName}.fifo`,
      fifo: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private createRegenerationFunction(): lambda.Function {
    // Use real code if:
    // - Next.js app was build; AND
    // - the Lambda code directory is not empty
    let code;
    let updaterCR;
    if (
      this.buildOutDir &&
      fs.pathExistsSync(
        path.join(this.buildOutDir, "regeneration-lambda", "index.js")
      )
    ) {
      const asset = new s3Assets.Asset(this, `RegenerationFunctionAsset`, {
        path: path.join(this.buildOutDir, "regeneration-lambda"),
      });
      code = lambda.Code.fromAsset(
        path.join(this.buildOutDir, "regeneration-lambda")
      );
      updaterCR = this.createLambdaCodeReplacer("Regeneration", asset);
    } else {
      code = lambda.Code.fromInline("  ");
    }

    // Create function
    const { defaults } = this.props;
    const fn = new lambda.Function(this, "RegenerationFunction", {
      handler: "index-wrapper.handler",
      runtime: this.normalizeRuntime(defaults?.function?.runtime),
      memorySize: defaults?.function?.memorySize || 1024,
      timeout: Duration.seconds(defaults?.function?.timeout || 30),
      code,
    });

    fn.addEventSource(
      new lambdaEventSources.SqsEventSource(this.cdk.regenerationQueue)
    );

    // Grant permissions
    this.cdk.bucket.grantReadWrite(fn);

    // Deploy after the code is updated
    if (updaterCR) {
      fn.node.addDependency(updaterCR);
    }

    return fn;
  }

  private createLambdaCodeReplacer(
    name: string,
    asset: s3Assets.Asset
  ): CustomResource {
    // Note: Source code for the Lambda functions have "{{ ENV_KEY }}" in them.
    //       They need to be replaced with real values before the Lambda
    //       functions get deployed.

    const providerId = "LambdaCodeReplacerProvider";
    const resId = `${name}LambdaCodeReplacer`;
    const stack = Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as lambda.Function;

    // Create provider if not already created
    if (!provider) {
      provider = new lambda.Function(stack, providerId, {
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../assets/NextjsSite/custom-resource")
        ),
        layers: [this.awsCliLayer],
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "lambda-code-updater.handler",
        timeout: Duration.minutes(15),
        memorySize: 1024,
      });
    }

    // Allow provider to perform search/replace on the asset
    provider.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [`arn:aws:s3:::${asset.s3BucketName}/${asset.s3ObjectKey}`],
      })
    );

    // Create custom resource
    const resource = new CustomResource(this, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTLambdaCodeUpdater",
      properties: {
        Source: {
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        },
        ReplaceValues: this.getLambdaContentReplaceValues(),
      },
    });

    return resource;
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

  private createS3Deployment(): CustomResource {
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
    uploader.grantInvoke(handler);

    // Create custom resource
    const fileOptions = [
      {
        exclude: "*",
        include: "public/*",
        cacheControl: "public,max-age=31536000,must-revalidate",
      },
      {
        exclude: "*",
        include: "static/*",
        cacheControl: "public,max-age=31536000,must-revalidate",
      },
      {
        exclude: "*",
        include: "static-pages/*",
        cacheControl: "public,max-age=0,s-maxage=2678400,must-revalidate",
      },
      {
        exclude: "*",
        include: "_next/data/*",
        cacheControl: "public,max-age=0,s-maxage=2678400,must-revalidate",
      },
      {
        exclude: "*",
        include: "_next/static/*",
        cacheControl: "public,max-age=31536000,immutable",
      },
    ];
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
        ReplaceValues: this.getS3ContentReplaceValues(),
      },
    });
  }

  /////////////////////
  // Build App
  /////////////////////

  private buildApp(): string {
    const app = this.node.root as App;
    const buildOutput = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
        props.sstTestBuildOutputPath || this.runBuild()
      : this.runBuild();

    this.runAfterBuild();

    return buildOutput;
  }

  private runBuild(): string {
    const { path: sitePath } = this.props;

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(
        `No path found at "${path.resolve(sitePath)}" for the "${
          this.node.id
        }" NextjsSite.`
      );
    }

    // Build command
    // Note: probably could pass JSON string also, but this felt safer.
    const app = this.node.root as App;
    const pathHash = getHandlerHash(sitePath);
    const buildOutput = path.join(app.buildDir, pathHash);
    const configBuffer = Buffer.from(
      JSON.stringify({
        cwd: path.resolve(sitePath),
        args: ["build"],
        cmd: this.props.nextBinPath ?? "./node_modules/.bin/next"
      })
    );

    // Run build
    console.log(chalk.grey(`Building Next.js site ${sitePath}`));
    const result = spawn.sync(
      "node",
      [
        path.join(__dirname, "../assets/NextjsSite/build/build.cjs"),
        "--path",
        path.resolve(sitePath),
        "--output",
        path.resolve(buildOutput),
        "--config",
        configBuffer.toString("base64"),
      ],
      {
        cwd: sitePath,
        stdio: "inherit",
        env: {
          ...process.env,
          ...getBuildCmdEnvironment(this.props.environment),
        },
      }
    );
    if (result.status !== 0) {
      console.error(
        `There was a problem building the "${this.node.id}" NextjsSite.`
      );
      process.exit(1);
    }

    return buildOutput;
  }

  private runAfterBuild() {
    const { path, commandHooks } = this.props;

    // Build command
    const cmds = commandHooks?.afterBuild ?? [];
    if (cmds.length === 0) {
      return;
    }

    try {
      execSync(cmds.join(" && "), {
        cwd: path,
        stdio: "inherit"
      });
    } catch (e) {
      console.log(
        chalk.red(`There was a problem running "afterBuild" command.`)
      );
      throw e;
    }
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private createCloudFrontDistribution(): cloudfront.Distribution {
    const { cdk, customDomain } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    // Validate input
    if (cfDistributionProps.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the NextjsSite domain certificate.`
      );
    }
    if (cfDistributionProps.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the NextjsSite domain.`
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
    }

    // Build behavior
    const origin = new origins.S3Origin(this.cdk.bucket);
    const viewerProtocolPolicy =
      cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;

    if (this.isPlaceholder) {
      return new cloudfront.Distribution(this, "Distribution", {
        defaultRootObject: "index.html",
        errorResponses: buildErrorResponsesForRedirectToIndex("index.html"),
        domainNames,
        certificate: this.cdk.certificate,
        defaultBehavior: {
          origin,
          viewerProtocolPolicy,
        },
      });
    }

    // Build Edge functions
    const edgeLambdas: cloudfront.EdgeLambda[] = [
      {
        includeBody: true,
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        functionVersion: this.mainFunctionVersion,
      },
      {
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
        functionVersion: this.mainFunctionVersion,
      },
    ];

    // Build cache policies
    const staticCachePolicy =
      cdk?.cachePolicies?.staticCachePolicy ??
      this.createCloudFrontStaticCachePolicy();
    const imageCachePolicy =
      cdk?.cachePolicies?.imageCachePolicy ??
      this.createCloudFrontImageCachePolicy();
    const lambdaCachePolicy =
      cdk?.cachePolicies?.lambdaCachePolicy ??
      this.createCloudFrontLambdaCachePolicy();

    // Build origin request policy
    const imageOriginRequestPolicy =
      cdk?.imageOriginRequestPolicy ??
      this.createCloudFrontImageOriginRequestPolicy();

    // Create Distribution
    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",
      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.cdk.certificate,
      defaultBehavior: {
        viewerProtocolPolicy,
        origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: lambdaCachePolicy,
        ...(cfDistributionProps.defaultBehavior || {}),
        // concatenate edgeLambdas
        edgeLambdas: [
          ...edgeLambdas,
          ...(cfDistributionProps.defaultBehavior?.edgeLambdas || []),
        ],
      },
      additionalBehaviors: {
        [this.pathPattern("_next/image*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: imageCachePolicy,
          originRequestPolicy: imageOriginRequestPolicy,
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: this.imageFunctionVersion,
            },
          ],
        },
        [this.pathPattern("_next/data/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: lambdaCachePolicy,
          edgeLambdas,
        },
        [this.pathPattern("_next/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: staticCachePolicy,
        },
        [this.pathPattern("static/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: staticCachePolicy,
        },
        [this.pathPattern("api/*")]: {
          viewerProtocolPolicy,
          origin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: lambdaCachePolicy,
          edgeLambdas: [
            {
              includeBody: true,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: this.apiFunctionVersion,
            },
          ],
        },
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private createCloudFrontStaticCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "StaticsCache",
      NextjsSite.staticCachePolicyProps
    );
  }

  private createCloudFrontImageCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "ImageCache",
      NextjsSite.imageCachePolicyProps
    );
  }

  private createCloudFrontLambdaCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "LambdaCache",
      NextjsSite.lambdaCachePolicyProps
    );
  }

  private createCloudFrontImageOriginRequestPolicy(): cloudfront.OriginRequestPolicy {
    return new cloudfront.OriginRequestPolicy(
      this,
      "ImageOriginRequest",
      NextjsSite.imageOriginRequestPolicyProps
    );
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

    // need the BuildId field so this CR gets updated on each deploy
    let buildId: string;
    if (this.isPlaceholder) {
      buildId = "live";
    } else {
      const buildIdFile = path.resolve(this.buildOutDir!, "assets", "BUILD_ID");
      buildId = fs.readFileSync(buildIdFile).toString();
    }

    // Create custom resource
    const waitForInvalidation =
      this.props.waitForInvalidation === false ? false : true;
    return new CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        BuildId: buildId,
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

  private pathPattern(pattern: string): string {
    const { basePath } = this.routesManifest || {};
    return basePath && basePath.length > 0
      ? `${basePath.slice(1)}/${pattern}`
      : pattern;
  }

  private readRoutesManifest(): RoutesManifest {
    return fs.readJSONSync(
      path.join(this.buildOutDir!, "default-lambda/routes-manifest.json")
    );
  }

  private getS3ContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] = [];

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
          },
          {
            files: "**/*.json",
            search: token,
            replace: value,
          }
        );
      });
    return replaceValues;
  }

  private getLambdaContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] = [];

    // The Next.js app can have environment variables like
    // `process.env.API_URL` in the JS code. `process.env.API_URL` might or
    // might not get resolved on `next build` if it is used in
    // server-side functions, ie. getServerSideProps().
    // Because Lambda@Edge does not support environment variables, we will
    // use the trick of replacing "{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}" with
    // a JSON encoded string of all environment key-value pairs. This string
    // will then get decoded at run time.
    const lambdaEnvs: { [key: string]: string } = {};

    Object.entries(this.props.environment || {}).forEach(([key, value]) => {
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
        },
        {
          files: "**/*.json",
          search: token,
          replace: value,
        }
      );
      lambdaEnvs[key] = value;
    });

    replaceValues.push({
      files: "**/*.js",
      search: '"{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}"',
      replace: JSON.stringify(lambdaEnvs),
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

    const app = this.node.root as App;
    app.registerSiteEnvironment({
      id: this.node.id,
      path: this.props.path,
      stack: Stack.of(this).node.id,
      environmentOutputs,
    } as BaseSiteEnvironmentOutputsInfo);
  }

  private normalizeRuntime(runtime?: string): lambda.Runtime {
    if (runtime === "nodejs12.x") {
      return lambda.Runtime.NODEJS_12_X;
    }
    else if (runtime === "nodejs14.x") {
      return lambda.Runtime.NODEJS_14_X;
    }
    return lambda.Runtime.NODEJS_16_X;
  }
}
