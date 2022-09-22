import chalk from "chalk";
import spawn from "cross-spawn";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import indent from "indent-string";
import path from "path";
import url from "url";

import { getChildLogger } from "@serverless-stack/core";
import {
  CfnOutput, CustomResource, Duration, Fn, RemovalPolicy
} from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Patterns from "aws-cdk-lib/aws-route53-patterns";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import { Construct } from "constructs";
const logger = getChildLogger("NextjsSsr");

import { Code, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { App } from "./App.js";
import {
  BaseSiteCdkDistributionProps, BaseSiteDomainProps, BaseSiteEnvironmentOutputsInfo,
  buildErrorResponsesForRedirectToIndex
} from "./BaseSite.js";
import { isCDKConstruct, SSTConstruct } from "./Construct.js";
import { Stack } from "./Stack.js";
import { attachPermissionsToRole, Permissions } from "./util/permission.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const NEXTJS_BUILD_DIR = '.next';
const NEXTJS_STATIC_DIR = 'static'
const NEXTJS_PUBLIC_DIR = 'public'
const NEXTJS_BUILD_STANDALONE_DIR = 'standalone';
const NEXTJS_BUILD_STANDALONE_ENV = 'NEXT_PRIVATE_STANDALONE'

export interface NextjsSsrDomainProps extends BaseSiteDomainProps { }
export interface NextjsSsrCdkDistributionProps
  extends BaseSiteCdkDistributionProps { }
export interface NextjsSsrProps {
  cdk?: {
    /**
     * Allows you to override default settings this construct uses internally to ceate the bucket
     */
    bucket?: s3.BucketProps | s3.IBucket;
    /**
     * Pass in a value to override the default settings this construct uses to
     * create the CDK `Distribution` internally.
     */
    distribution?: NextjsSsrCdkDistributionProps;
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
  };

  /**
   * Path to the directory where the website source is located.
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
   * ```js {3}
   * new NextjsSsr(stack, "Site", {
   *   path: "path/to/site",
   *   customDomain: "domain.com",
   * });
   * ```
   *
   * ```js {3-6}
   * new NextjsSsr(stack, "Site", {
   *   path: "path/to/site",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com"
   *   },
   * });
   * ```
   */
  customDomain?: string | NextjsSsrDomainProps;

  /**
   * An object with the key being the environment variable name.
   *
   * @example
   * ```js {3-6}
   * new NextjsSsr(stack, "Site", {
   *   path: "path/to/site",
   *   environment: {
   *     API_URL: api.url,
   *     USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * });
   * ```
   */
  environment?: Record<string, string>;

  /**
   * When running `sst start`, a placeholder site is deployed. This is to ensure
   * that the site content remains unchanged, and subsequent `sst start` can
   * start up quickly.
   *
   * @example
   * ```js {3}
   * new NextjsSsr(stack, "NextjsSsr", {
   *   path: "path/to/site",
   *   disablePlaceholder: true,
   * });
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
}

/**
 * The `NextjsSsr` construct is a higher level CDK construct that makes it easy to create a Nextjs app.
 *
 * Your standalone application will be bundled using output tracing and will be deployed to a Lambda function. You must use Next.js 10.3.0 or newer.
 *
 * @example
 *
 * Deploys a Nextjs app in the `my-nextjs-app` directory.
 *
 * ```js
 * new NextjsSsr(stack, "web", {
 *   path: "my-nextjs-app/",
 * });
 * ```
 */
export class NextjsSsr extends Construct implements SSTConstruct {
  /**
   * The default CloudFront cache policy properties for static pages.
   */
  public static staticCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: Duration.days(30),
    maxTtl: Duration.days(60),
    minTtl: Duration.days(30),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST Nextjs Static Default Cache Policy",
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
    comment: "SST Nextjs Image Default Cache Policy",
  };

  /**
   * The default CloudFront cache policy properties for the Lambda server handler.
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
    comment: "SST Nextjs Lambda Default Cache Policy",
  };

  /**
   * The default CloudFront image origin request policy properties for Next images.
  */
  public static imageOriginRequestPolicyProps: cloudfront.OriginRequestPolicyProps =
    {
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      comment: "SST Nextjs Lambda Default Origin Request Policy",
    };


  /**
   * Exposes CDK instances created within the construct.
   */
  public readonly cdk: {
    /**
     * The main Nextjs server handler lambda function.
     */
    serverFunction: lambda.Function;
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
  private props: NextjsSsrProps;
  /**
   * Determines if a placeholder site should be deployed instead. We will set
   * this to `true` by default when performing local development, although the
   * user can choose to override this value.
   */
  private isPlaceholder: boolean;
  /**
   * The root SST directory used for builds.
   */
  private sstBuildDir: string;
  private awsCliLayer: AwsCliLayer;
  public originAccessIdentity: cloudfront.IOriginAccessIdentity

  constructor(scope: Construct, id: string, props: NextjsSsrProps) {
    super(scope, id);

    const app = scope.node.root as App;
    try {
      this.isPlaceholder =
        (app.local || app.skipBuild) && !props.disablePlaceholder;
      this.sstBuildDir = app.buildDir;
      this.props = props;
      this.cdk = {} as any;
      this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
      this.registerSiteEnvironment();

      // Prepare app
      if (this.isPlaceholder) {
      } else {
        this.buildApp();
      }

      this.originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI(', {
        comment: 'Allows CloudFront to access S3 bucket with assets',
      })

      // Create Bucket which will be utilised to contain the statics
      this.cdk.bucket = this.createS3Bucket();
      this.cdk.bucket.grantRead(this.originAccessIdentity);

      // Create Server function
      this.cdk.serverFunction = this.createServerFunction();;

      // Create Custom Domain
      this.validateCustomDomainSettings();
      this.cdk.hostedZone = this.lookupHostedZone();
      this.cdk.certificate = this.createCertificate();

      // Create S3 Deployment
      const s3Deployments = this.uploadS3Assets()

      // Create CloudFront
      this.validateCloudFrontDistributionSettings();
      this.cdk.distribution = this.isPlaceholder
        ? this.createCloudFrontDistributionForStub()
        : this.createCloudFrontDistribution();
      s3Deployments.forEach(s3Deployment => this.cdk.distribution.node.addDependency(s3Deployment))

      // Invalidate CloudFront (might already be handled by S3 deployment?)
      const invalidationCR = this.createCloudFrontInvalidation();
      invalidationCR.node.addDependency(this.cdk.distribution);

      // Connect Custom Domain to CloudFront Distribution
      this.createRoute53Records();
    } catch (error) {
      // If running an SST test then re-throw the error so that it can be
      // tested
      if (app.isRunningSSTTest()) {
        throw error;
      }

      console.error(
        chalk.red(
          `\nError: There was a problem synthesizing the NextjsSsr at "${props.path}".`
        )
      );
      if (error instanceof Error) {
        if (error.stack) {
          console.error(chalk.red(indent(`\n${error.stack}`, 2)));
        } else if (error.message) {
          console.error(chalk.bold.red(indent(`\n${error.message}`, 2)));
        } else {
          console.error(chalk.bold.red(indent("\nAn unknown error occurred")));
        }
      }
      process.exit(1);
    }
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
   * Attaches the given list of permissions to allow the Nextjs server side
   * rendering to access other AWS resources.
   *
   * @example
   * ```js {5}
   * const site = new NextjsSsr(stack, "Site", {
   *   path: "path/to/site",
   * });
   *
   * site.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    attachPermissionsToRole(this.cdk.serverFunction.role as iam.Role, permissions);
  }

  public getConstructMetadata() {
    return {
      type: "NextjsSsr" as const,
      data: {
        distributionId: this.cdk.distribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  /////////////////////
  // Build App
  /////////////////////

  private buildApp() {

    // Build
    const app = this.node.root as App;
    if (!app.isRunningSSTTest()) {
      this.runNpmBuild();
    }

    // Validate build output exists
    const baseOutputDir = path.resolve(this.props.path)
    const serverBuildDir = path.join(
      baseOutputDir, NEXTJS_BUILD_DIR
    );

    if (!fs.existsSync(serverBuildDir)) {
      throw new Error(
        `No server build output found at "${serverBuildDir}"`
      );
    }
  }

  private runNpmBuild() {
    const { path: sitePath } = this.props;

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(`No path found at "${path.resolve(sitePath)}"`);
    }

    // Ensure that the site has a build script defined
    if (!fs.existsSync(path.join(sitePath, "package.json"))) {
      throw new Error(`No package.json found at "${sitePath}".`);
    }
    const packageJson = fs.readJsonSync(path.join(sitePath, "package.json"));
    if (!packageJson.scripts || !packageJson.scripts.build) {
      throw new Error(
        `No "build" script found within package.json in "${sitePath}".`
      );
    }

    // Run build
    logger.debug(`Running "npm build" script`);
    const buildResult = spawn.sync("npm", ["run", "build"], {
      cwd: sitePath,
      stdio: "inherit",
      env: {
        ...process.env,
        [NEXTJS_BUILD_STANDALONE_ENV]: 'true'
      },
    });
    if (buildResult.status !== 0) {
      throw new Error('The app "build" script failed.');
    }
  }

  private buildLayer(): LayerVersion {
    const layerDir = path.resolve(__dirname, "../assets/NextjsSite/layer");
    const sharpLayer = new LayerVersion(this, "SharpLayer", {
      code: new lambda.AssetCode(path.join(layerDir, "sharp-0.30.0.zip")),
      compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
      description: "Sharp for NextJS",
    });
    return sharpLayer;

    ///////  other ways to build this layer:
    // const buildDir = path.resolve(
    //   path.join(this.sstBuildDir, `NextjsLayer-${this.node.id}-${this.node.addr}`)
    // );
    // fs.removeSync(buildDir);
    // fs.mkdirSync(buildDir, { recursive: true });
    // const zipFile ="nextjs-layer.zip"
    // const zipFilePath = path.join(buildDir, zipFile);
    // const LAMBDA_FOLDER = 'nodejs'
    // const createBundleCmdArgs = [
    //   '-xc',
    //   [
    //     `mkdir -p ${LAMBDA_FOLDER}`,
    //     `cd ${LAMBDA_FOLDER}`,
    //     `npm install \
    //     --arch=x64 \
    //     --platform=linux \
    //     --target=16.15 \
    //     --libc=glibc \
    //     next sharp`,
    //     'cd ..',
    //     `zip -qr ${zipFile} ${LAMBDA_FOLDER}`
    //   ].join(' && '),
    // ];

    // const buildResult = spawn.sync('bash', createBundleCmdArgs, {
    //   cwd: buildDir,
    //   stdio: "inherit",
    // });
    // if (buildResult.status !== 0 || !fs.existsSync(zipFilePath)) {
    //   throw new Error(`Failed to create nextjs layer in ${buildDir}`);
    // }

    // // hash our parameters so we know when we need t rebuild
    // const bundleCommandHash = crypto.createHash('sha256');
    // bundleCommandHash.update(JSON.stringify(createBundleCmdArgs));

    // // bundle
    // const code = Code.fromAsset(zipFilePath);

    // // const code = Code.fromAsset(__dirname, {
    // //   // don't send all our files to docker (slow)
    // //   ignoreMode: IgnoreMode.GLOB,
    // //   exclude: ['*'],

    // //   // if our bundle commands (basically our "dockerfile") changes then rebuild the image
    // //   assetHashType: AssetHashType.CUSTOM,
    // //   assetHash: bundleCommandHash.digest('hex'),

    // //   bundling: {
    // //     image: lambda.Runtime.NODEJS_16_X.bundlingImage,
    // //     command: createBundleCommand,
    // //   },
    // // });

    // // Build Next.js layer
    // const nextjsLayer = new lambda.LayerVersion(this, "NextjsLayer", {
    //   code,
    //   compatibleRuntimes: [lambda.Runtime.NODEJS_16_X],
    //   description: "Next.js",
    // });
    // return nextjsLayer;
  }

  /////////////////////
  // Bundle S3 Assets
  /////////////////////

  private uploadS3Assets() {
    const deployments: BucketDeployment[] = [];

    // path to public folder; root static assets
    const staticDir = this.getNextStaticDir()
    let publicDir = this.getNextPublicDir()

    // static dir
    if (this.isPlaceholder) {
      publicDir = path.resolve(__dirname, "../assets/NextjsSite/site-stub")
    } else if (fs.existsSync(staticDir)) {
      // upload static assets
      deployments.push(new BucketDeployment(this, 'StaticAssetsDeployment', {
        destinationBucket: this.cdk.bucket,
        destinationKeyPrefix: '_next/static',
        sources: [Source.asset(staticDir)],
        distribution: this.cdk.distribution, // invalidate Cloudfront distribution caches
        prune: false, // do not delete stale files
      }))
    }

    // public dir
    if (fs.existsSync(publicDir)) {
      // zip up assets
      const zipFilePath = this.createArchive(publicDir, 'public.zip')

      // upload public files to root of S3 bucket
      deployments.push(new BucketDeployment(this, 'PublicFilesDeployment', {
        destinationBucket: this.cdk.bucket,
        destinationKeyPrefix: '/',
        sources: [Source.asset(zipFilePath)],
        distribution: this.cdk.distribution,
        prune: false
      })
      )
    }
    return deployments;
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

  // zip up a directory and return path to zip file
  private createArchive(directory: string, zipFileName: string): string {
    // get output path
    const zipOutDir = path.resolve(
      path.join(this.sstBuildDir, `NextjsSsr-standalone-${this.node.id}-${this.node.addr}`)
    );
    fs.removeSync(zipOutDir);
    fs.mkdirpSync(zipOutDir);
    const zipFilePath = path.join(zipOutDir, zipFileName);


    // run script to create zipfile, preserving symlinks for node_modules (e.g. pnpm structure)
    const result = spawn.sync(
      "bash", // getting ENOENT when specifying 'node' here for some reason
      [
        '-xc',
        [`cd '${directory}'`, `zip -ryq '${zipFilePath}' *`].join('&&')
      ],
      { stdio: "inherit", }
    );
    if (result.status !== 0) {
      throw new Error(`There was a problem generating the package for ${zipFileName} with ${directory}: ${result.error}`);
    }
    // check output
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`There was a problem generating the archive for ${directory}; the archive is missing in ${zipFilePath}.`)
    }

    return zipFilePath
  }

  /////////////////////
  // Bundle Lambda Server
  /////////////////////


  private createServerFunction(): NodejsFunction {
    const app = App.of(this) as App
    const { defaults, environment, path: nextjsPath } = this.props;

    // build native deps layer
    const nextLayer = this.buildLayer()

    // build and bundle the handler
    const code = this.createServerCode()

    // build the lambda function
    const fn = new lambda.Function(this, 'MainFn', {
      memorySize: defaults?.function?.memorySize || 1024,
      timeout: defaults?.function?.timeout ? Duration.seconds(defaults.function.timeout) : Duration.seconds(10),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: path.join(nextjsPath, 'server.handler'),
      layers: [nextLayer],
      code,
      environment,
    });
    this.cdk.serverFunction = fn;

    // attach permissions
    this.cdk.bucket.grantReadWrite(fn.role!);
    if (defaults?.function?.permissions) {
      attachPermissionsToRole(fn.role as iam.Role, defaults.function.permissions);
    }

    return fn;
  }

  private bundleServerHandler(nextjsPath: string, standaloneDirAbsolute: string) {
    // delete default nextjs handler if it exists
    const defaultServerPath = path.join(standaloneDirAbsolute, nextjsPath, 'server.js')
    if (fs.existsSync(defaultServerPath))
      fs.unlinkSync(defaultServerPath)

    // build our server handler
    const serverHandler = path.resolve(__dirname, "../assets/NextjsSite/server-lambda/server.ts");
    // server should live in the same dir as the nextjs app to access deps properly
    const serverPath = path.join(nextjsPath, "server.cjs")
    const esbuildResult = esbuild.buildSync({
      entryPoints: [serverHandler],
      bundle: true,
      minify: false,
      sourcemap: true,
      target: "node16",
      platform: "node",
      external: ["sharp", "next"],
      format: "cjs",
      outfile: path.join(standaloneDirAbsolute, serverPath)
    })
    if (esbuildResult.errors.length > 0) {
      esbuildResult.errors.forEach((error) => console.error(error));
      throw new Error(`There was a problem bundling the server.`);
    }
  }

  private createServerCode(): lambda.Code {
    if (this.isPlaceholder) {
      return lambda.Code.fromInline("module.exports.handler = async () => { return { statusCode: 200, body: 'SST placeholder site' } }")
    }

    const standaloneDirAbsolute = this.getNextStandaloneDir()

    // build our handler
    this.bundleServerHandler(this.props.path, standaloneDirAbsolute)

    // zip up the directory
    const zipFilePath = this.createArchive(standaloneDirAbsolute, 'standalone.zip')
    return lambda.Code.fromAsset(zipFilePath)
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private validateCloudFrontDistributionSettings() {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    if (cfDistributionProps.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the NextjsSsr domain certificate.`
      );
    }
    if (cfDistributionProps.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the NextjsSsr domain.`
      );
    }
  }

  private createCloudFrontDistribution(): cloudfront.Distribution {
    const { cdk, customDomain } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    this.validateCloudFrontDistributionSettings()

    // build domainNames
    const domainNames = [];
    if (!customDomain) {
      // no domain
    } else if (typeof customDomain === "string") {
      domainNames.push(customDomain);
    } else {
      domainNames.push(customDomain.domainName);
    }

    // S3 origin
    const s3Origin = new origins.S3Origin(this.cdk.bucket, { originAccessIdentity: this.originAccessIdentity });

    const viewerProtocolPolicy =
      cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS;

    // handle placeholder
    if (this.isPlaceholder) {
      return new cloudfront.Distribution(this, "Distribution", {
        defaultRootObject: "index.html",
        errorResponses: buildErrorResponsesForRedirectToIndex("index.html"),
        domainNames,
        certificate: this.cdk.certificate,
        defaultBehavior: {
          origin: s3Origin,
          viewerProtocolPolicy,
        },
      });
    }

    const staticCachePolicy =
      cdk?.cachePolicies?.staticCachePolicy ??
      this.createCloudFrontStaticCachePolicy();
    const imageCachePolicy =
      cdk?.cachePolicies?.imageCachePolicy ??
      this.createCloudFrontImageCachePolicy();
    const imageOriginRequestPolicy =
      cdk?.imageOriginRequestPolicy ??
      this.createCloudFrontImageOriginRequestPolicy();

    // main server function origin (lambda URL HTTP origin)
    const fnUrl = this.cdk.serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const serverFunctionOrigin = new origins.HttpOrigin(Fn.parseDomainName(fnUrl.url))

    // default handler for requests that don't match any other path:
    //   - try S3 first
    //   - if 404 not found, fall back to lambda handler
    const fallbackOriginGroup = new origins.OriginGroup({
      primaryOrigin: s3Origin,
      fallbackOrigin: serverFunctionOrigin,
      fallbackStatusCodes: [404],
    })

    // TODO: how to apply to fallbackOrigin?
    const lambdaCachePolicy =
      cdk?.cachePolicies?.lambdaCachePolicy ??
      this.createCloudFrontLambdaCachePolicy();

    // requests for static objects
    const staticBehavior: cloudfront.BehaviorOptions = {
      viewerProtocolPolicy,
      origin: s3Origin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: staticCachePolicy,
    };

    // requests going to lambda
    const lambdaBehavior: cloudfront.BehaviorOptions = {
      viewerProtocolPolicy,
      origin: serverFunctionOrigin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: lambdaCachePolicy,
    }

    return new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "",

      // Override props.
      ...cfDistributionProps,

      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.cdk.certificate,
      defaultBehavior: {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: fallbackOriginGroup,  // try S3 first, then lambda
        // allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: lambdaCachePolicy, // what goes here? static or lambda/
      },

      additionalBehaviors: {
        // known dynamic routes
        "api/*": lambdaBehavior,
        '_next/data/*': lambdaBehavior,

        // known static routes
        // it would be nice to create routes for all the static files we know of
        // but we run into the limit of CacheBehaviors per distribution
        '_next/*': staticBehavior,

        // TODO
        "_next/image*": lambdaBehavior,
        // "_next/image*": {
        //   viewerProtocolPolicy,
        //   origin,
        //   allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        //   cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        //   compress: true,
        //   cachePolicy: imageCachePolicy,
        //   originRequestPolicy: imageOriginRequestPolicy,
        // },

        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  // delete me
  private buildDistributionStaticBehavior(staticBehavior: cloudfront.BehaviorOptions): Record<string, cloudfront.BehaviorOptions> {
    // it would be nice to create routes for all the static files we know of
    // but we run into the limit of CacheBehaviors per distribution
    return { '_next/*': staticBehavior }

    /*
    const validRoute = /^[a-zA-Z0-9_\-\.\*\$\/\~"'&@:\?\+]+$/ // valid characters for a route
    const files = this.getPublicFileList();
    const routes = files.map(file => {
      if (file.endsWith('/.DS_Store')) return
      if (!validRoute.test(file)) {
        console.warn(`Not creating CloudFront behavior for static path due to weird filename: ${file}`)
        return
      }
      return file
    }).filter(Boolean) as string[]

    // map /foo.jpg -> S3 static origin behavior
    const staticRoutes = Object.fromEntries(routes.map(route => [route, staticBehavior]))

    // _next/* too
    staticRoutes['_next/*'] = staticBehavior

    return staticRoutes
    */
  }

  private createCloudFrontStaticCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "StaticsCache",
      NextjsSsr.staticCachePolicyProps
    );
  }

  private createCloudFrontImageCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "ImageCache",
      NextjsSsr.imageCachePolicyProps
    );
  }

  private createCloudFrontLambdaCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "LambdaCache",
      NextjsSsr.lambdaCachePolicyProps
    );
  }

  private createCloudFrontImageOriginRequestPolicy(): cloudfront.OriginRequestPolicy {
    return new cloudfront.OriginRequestPolicy(
      this,
      "ImageOriginRequest",
      NextjsSsr.imageOriginRequestPolicyProps
    );
  }

  private createCloudFrontDistributionForStub(): cloudfront.Distribution {
    return new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      errorResponses: buildErrorResponsesForRedirectToIndex("index.html"),
      domainNames: this.buildDistributionDomainNames(),
      certificate: this.cdk.certificate,
      defaultBehavior: {
        origin: new origins.S3Origin(this.cdk.bucket, { originAccessIdentity: this.originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
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
    }
    return domainNames;
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

    const waitForInvalidation =
      this.props.waitForInvalidation === false ? false : true;

    return new CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        BuildId: this.isPlaceholder ? "live" : this.getNextBuildId(),
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

  getNextBuildId() {
    return fs.readFileSync(
      path.join(this.getNextStandaloneBuildDir(), 'BUILD_ID'), 'utf-8')
  }

  private listDirectory(dir: string) {
    const fileList: string[] = []
    const publicFiles = fs.readdirSync(dir)
    for (const filename of publicFiles) {
      const filepath = path.join(dir, filename)
      const stat = fs.statSync(filepath)
      if (stat.isDirectory()) {
        fileList.push(...this.listDirectory(filepath))
      } else {
        fileList.push(filepath)
      }
    }

    return fileList
  }

  getPublicFileList() {
    const publicDir = this.getNextPublicDir()
    return this.listDirectory(publicDir).map((file) => path.join('/', path.relative(publicDir, file)))
  }


  // get the path to the directory containing the nextjs project
  // it may be the project root or a subdirectory in a monorepo setup
  private getNextDir() {
    const app = App.of(this) as App
    const { path: nextjsPath } = this.props;  // path to nextjs dir inside project
    const absolutePath = path.join(app.appPath, nextjsPath) // e.g. /home/me/myapp/web
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Could not find ${absolutePath} directory.`);
    }
    return absolutePath;
  }

  // .next
  private getNextBuildDir() {
    return path.join(this.getNextDir(), NEXTJS_BUILD_DIR)
  }


  // output of nextjs standalone build
  private getNextStandaloneDir() {
    const nextDir = this.getNextBuildDir()
    const standaloneDir = path.join(nextDir, NEXTJS_BUILD_STANDALONE_DIR)

    if (!fs.existsSync(standaloneDir)) {
      throw new Error(`Could not find ${standaloneDir} directory.`);
    }
    return standaloneDir
  }

  // nextjs project inside of standalone build
  // contains manifests
  private getNextStandaloneBuildDir() {
    return path.join(this.getNextStandaloneDir(), this.props.path, NEXTJS_BUILD_DIR);
  }

  // contains static files
  private getNextStaticDir() {
    return path.join(this.getNextBuildDir(), NEXTJS_STATIC_DIR);
  }
  private getNextPublicDir() {
    return path.join(this.getNextDir(), NEXTJS_PUBLIC_DIR);
  }
}
