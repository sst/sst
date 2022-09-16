import chalk from "chalk";
import spawn from "cross-spawn";
import crypto from "crypto";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import glob from "glob";
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
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import { Construct } from "constructs";
const logger = getChildLogger("NextjsSite");

import { IFunction, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
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
const NEXTJS_BUILD_STANDALONE_DIR = 'standalone';
const NEXTJS_BUILD_STANDALONE_ENV = 'NEXT_PRIVATE_STANDALONE'

export interface NextjsDomainProps extends BaseSiteDomainProps { }
export interface NextjsCdkDistributionProps
  extends BaseSiteCdkDistributionProps { }
export interface NextjsSiteProps {
  cdk?: {
    /**
     * Allows you to override default settings this construct uses internally to ceate the bucket
     */
    bucket?: s3.BucketProps | s3.IBucket;
    /**
     * Pass in a value to override the default settings this construct uses to
     * create the CDK `Distribution` internally.
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
   * new NextjsSite(stack, "Site", {
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
   * new NextjsSite(stack, "NextjsSite", {
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
 * The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Nextjs app.
 *
 * @example
 *
 * Deploys a Nextjs app in the `my-nextjs-app` directory.
 *
 * ```js
 * new NextjsSite(stack, "web", {
 *   path: "my-nextjs-app/",
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
    comment: "SST NextjsSite Lambda Default Cache Policy",
  };

  /**
   * The default CloudFront image origin request policy properties for Next images.
  */
  public static imageOriginRequestPolicyProps: cloudfront.OriginRequestPolicyProps =
    {
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      comment: "SST NextjsSite Lambda Default Origin Request Policy",
    };


  /**
   * Exposes CDK instances created within the construct.
   */
  public readonly cdk: {
    /**
     * The internally created CDK `Function` instance.
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
  private props: NextjsSiteProps;
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
  private serverLambda?: lambda.Function;
  private awsCliLayer: AwsCliLayer;

  constructor(scope: Construct, id: string, props: NextjsSiteProps) {
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

      // Create Bucket which will be utilised to contain the statics
      this.cdk.bucket = this.createS3Bucket();

      // Create Server function
      this.serverLambda = this.createServerFunction();
      this.cdk.function = this.serverLambda;

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
      this.cdk.distribution = this.isPlaceholder
        ? this.createCloudFrontDistributionForStub()
        : this.createCloudFrontDistribution();
      this.cdk.distribution.node.addDependency(s3deployCR);

      // Invalidate CloudFront
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
          `\nError: There was a problem synthesizing the NextjsSite at "${props.path}".`
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
   * const site = new NextjsSite(stack, "Site", {
   *   path: "path/to/site",
   * });
   *
   * site.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    if (this.serverLambda) {
      attachPermissionsToRole(this.serverLambda.role as iam.Role, permissions);
    }
  }

  public getConstructMetadata() {
    return {
      type: "NextjsSite" as const,
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
      description: "Sharp for NextjsSite",
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
    // console.log(createBundleCmdArgs)

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

  private createStaticsS3Assets(): s3Assets.Asset[] {
    const app = this.node.root as App;
    const fileSizeLimit = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
      this.props.sstTestFileSizeLimitOverride || 200
      : 200;

    // First we need to create zip files containing the statics
    const script = path.resolve(__dirname, "../assets/BaseSite/archiver.cjs");
    const zipOutDir = path.resolve(
      path.join(this.sstBuildDir, `NextjsSite-${this.node.id}-${this.node.addr}`)
    );
    // Remove zip dir to ensure no partX.zip remain from previous build
    fs.removeSync(zipOutDir);

    const result = spawn.sync(
      "node",
      [
        script,
        path.join(this.props.path, "public"),
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
        path: path.resolve(__dirname, "../assets/NextjsSite/site-stub"),
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
        path.join(__dirname, "../assets/BaseSite/custom-resource")
      ),
      layers: [this.awsCliLayer],
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: Duration.minutes(15),
      memorySize: 1024,
    });
    this.cdk.bucket.grantReadWrite(uploader);
    assets.forEach((asset) =>
      asset.grantRead(uploader)
    );

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

    // Build file options
    const fileOptions = [];
    const publicPath = path.join(this.props.path, "public");
    for (const item of fs.readdirSync(publicPath)) {
      if (item === "build") {
        fileOptions.push({
          exclude: "*",
          include: "build/*",
          cacheControl: "public,max-age=31536000,immutable",
        });
      } else {
        const itemPath = path.join(publicPath, item);
        fileOptions.push({
          exclude: "*",
          include: fs.statSync(itemPath).isDirectory()
            ? `${item}/*`
            : `${item}`,
          cacheControl: "public,max-age=3600,must-revalidate",
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

  private createServerFunction(): NodejsFunction {
    const app = App.of(this) as App
    const { defaults, environment, path: nextjsPath } = this.props;

    // build native deps layer
    const nextLayer = this.buildLayer()

    // bundle the standalone output dir
    const standaloneDir = path.join(nextjsPath, NEXTJS_BUILD_DIR, NEXTJS_BUILD_STANDALONE_DIR)
    const standaloneDirAbsolute = path.join(app.appPath, standaloneDir)
    if (!fs.existsSync(standaloneDirAbsolute)) {
      throw new Error(`Could not find ${standaloneDir} directory. Please run "npm run build" before deploying.`);
    }

    const zipFilePath = this.createServerZip(standaloneDirAbsolute)

    // build the lambda function
    const fn = new lambda.Function(this, 'MainFn', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: path.join(nextjsPath, 'server.handler'),
      layers: [nextLayer],
      code: lambda.Code.fromAsset(zipFilePath),
      environment,
    });

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
    const serverHandler = this.isPlaceholder ? path.resolve(__dirname, "../assets/NextjsSite/server-lambda-stub/server.js")
      : path.resolve(__dirname, "../assets/NextjsSite/server-lambda/server.ts");
    // server should live in the same dir as the nextjs app to access deps properly
    const serverPath = path.join(nextjsPath, "server.mjs")
    const esbuildResult = esbuild.buildSync({
      entryPoints: [serverHandler],
      bundle: true,
      minify: true,
      target: "node16",
      platform: "node",
      external: ["sharp", "next"],
      format: "esm",
      outfile: path.join(standaloneDirAbsolute, serverPath)
    })
    if (esbuildResult.errors.length > 0) {
      esbuildResult.errors.forEach((error) => console.error(error));
      throw new Error(`There was a problem bundling the server.`);
    }
  }

  private createServerZip(standaloneDirAbsolute: string): string {
    // build our handler
    this.bundleServerHandler(this.props.path, standaloneDirAbsolute)

    // get output path
    const zipOutDir = path.resolve(
      path.join(this.sstBuildDir, `NextjsSite-standalone-${this.node.id}-${this.node.addr}`)
    );
    fs.removeSync(zipOutDir);
    fs.mkdirpSync(zipOutDir);
    const zipFilePath = path.join(zipOutDir, "standalone.zip");


    // run script to create zipfile, preserving symlinks for node_modules (e.g. pnpm structure)
    const result = spawn.sync(
      "bash", // getting ENOENT when specifying 'node' here for some reason
      [
        '-xc',
        [`cd '${standaloneDirAbsolute}'`, `zip -ryq '${zipFilePath}' *`].join('&&')
      ],
      { stdio: "inherit", }
    );
    if (result.status !== 0) {
      throw new Error(`There was a problem generating the lambda package: ${result.error}`);
    }
    // check output
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`There was a problem generating the lambda package; archive missing in ${zipFilePath}.`)
    }

    return zipFilePath
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private validateCloudFrontDistributionSettings() {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
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
  }

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

    // Build cache policies
    const staticCachePolicy =
      cdk?.cachePolicies?.staticCachePolicy ??
      this.createCloudFrontStaticCachePolicy();
    const imageCachePolicy =
      cdk?.cachePolicies?.imageCachePolicy ??
      this.createCloudFrontImageCachePolicy();

    // Build origin request policy
    const imageOriginRequestPolicy =
      cdk?.imageOriginRequestPolicy ??
      this.createCloudFrontImageOriginRequestPolicy();

    const staticBehavior = {
      viewerProtocolPolicy,
      origin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: staticCachePolicy,
    };
    return new cloudfront.Distribution(this, "Distribution", {
      // these values can be overwritten by cfDistributionProps
      defaultRootObject: "",

      // Override props.
      ...cfDistributionProps,
      // these values can NOT be overwritten by cfDistributionProps
      domainNames,
      certificate: this.cdk.certificate,
      defaultBehavior: this.buildDistributionDefaultBehavior(),
      additionalBehaviors: {
        // [("_next/image*")]: {
        //   viewerProtocolPolicy,
        //   origin,
        //   allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        //   cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        //   compress: true,
        //   cachePolicy: imageCachePolicy,
        //   originRequestPolicy: imageOriginRequestPolicy,
        // },

        "public/*": staticBehavior,
        "static/*": staticBehavior,
        // "api/*": {
        //   viewerProtocolPolicy,
        //   origin,
        //   allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        //   cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        //   compress: true,
        //   cachePolicy: lambdaCachePolicy,
        // },
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private buildDistributionDefaultBehavior(): cloudfront.BehaviorOptions {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    const fnUrl = this.serverLambda!.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const serverCachePolicy =
      cdk?.cachePolicies?.lambdaCachePolicy ??
      this.createCloudFrontLambdaCachePolicy();

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

  private generateBuildId(): string {
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
      ignore: ["build/**"],
      cwd: path.resolve(this.props.path, "public"),
    };
    const files = glob.sync("**", globOptions);
    const hash = crypto.createHash("sha1");
    for (const file of files) {
      hash.update(file);
    }
    const buildId = hash.digest("hex");

    logger.debug(`Generated build ID ${buildId}`);

    return buildId;
  }
}
