import chalk from "chalk";
import path from "path";
import url from "url";
import fs from "fs-extra";
import spawn from "cross-spawn";
import { readPackageSync } from "read-pkg";
import * as z from "zod";
import indent from "indent-string";

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

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { SSTConstruct } from "./Construct.js";
import {
  BaseSiteDomainProps,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  BaseSiteEnvironmentOutputsInfo,
  getBuildCmdEnvironment,
  buildErrorResponsesForRedirectToIndex,
} from "./BaseSite.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";

// This references a directory named after Nextjs, but the underlying code
// appears to be generic enough to utilise in this case.
import * as crossRegionHelper from "./nextjs-site/cross-region-helper.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

// This aids us in ensuring the user is providing our expected remix.config.js
// values. We will follow a required convention as is typical in some of the
// official Remix templates for other deployment targets.
// @see https://remix.run/docs/en/v1/api/conventions#remixconfigjs
const expectedRemixConfigSchema = z.object({
  // The path to the browser build, relative to remix.config.js. Defaults to
  // "public/build". Should be deployed to static hosting.
  assetsBuildDirectory: z.literal("public/build"),
  // The URL prefix of the browser build with a trailing slash. Defaults to
  // "/build/". This is the path the browser will use to find assets.
  // Note: Remix additionally has a "public" folder, which should be considered
  // different to this. We seperately need to deploy the "public" folder and
  // ensure the files/directories are mapped relative to the root of the
  // domain.
  publicPath: z.literal("/build/"),
  // The path to the server build file, relative to remix.config.js. This file
  // should end in a .js extension and should be deployed to your server.
  serverBuildPath: z.literal("build/index.js"),
  // The target of the server build.
  serverBuildTarget: z.literal("node-cjs"),
  // A server entrypoint, relative to the root directory that becomes your
  // server's main module. If specified, Remix will compile this file along with
  // your application into a single file to be deployed to your server.
  server: z.string().optional(),
});

type RemixConfig = z.infer<typeof expectedRemixConfigSchema>;

export interface RemixDomainProps extends BaseSiteDomainProps {}
export interface RemixCdkDistributionProps
  extends BaseSiteCdkDistributionProps {}
export interface RemixSiteProps {
  cdk?: {
    /**
     * Pass in bucket information to override the default settings this
     * construct uses to create the CDK Bucket internally.
     */
    bucket?: s3.BucketProps;
    /**
     * Pass in a value to override the default settings this construct uses to
     * create the CDK `Distribution` internally.
     */
    distribution?: RemixCdkDistributionProps;
    /**
     * Override the default CloudFront cache policies created internally.
     */
    cachePolicies?: {
      /**
       * Override the CloudFront cache policy properties for browser build files.
       */
      browserBuildCachePolicy?: cloudfront.ICachePolicy;
      /**
       * Override the CloudFront cache policy properties for "public" folder
       * static files.
       *
       * Note: This will not include the browser build files, which have a seperate
       * cache policy; @see `browserBuildCachePolicy`.
       */
      publicCachePolicy?: cloudfront.ICachePolicy;
      /**
       * Override the CloudFront cache policy properties for responses from the
       * server rendering Lambda.
       */
      serverResponseCachePolicy?: cloudfront.ICachePolicy;
    };
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
   * new RemixSite(stack, "RemixSite", {
   *   path: "path/to/site",
   *   customDomain: "domain.com",
   * });
   * ```
   *
   * ```js {3-6}
   * new RemixSite(stack, "RemixSite", {
   *   path: "path/to/site",
   *   customDomain: {
   *     domainName: "domain.com",
   *     domainAlias: "www.domain.com",
   *     hostedZone: "domain.com"
   *   },
   * });
   * ```
   */
  customDomain?: string | RemixDomainProps;

  /**z
   * An object with the key being the environment variable name.
   *
   * @example
   * ```js {3-6}
   * new RemixSite(stack, "RemixSite", {
   *   path: "path/to/site",
   *   environment: {
   *     API_URL: api.url,
   *     USER_POOL_CLIENT: auth.cognitoUserPoolClient.userPoolClientId,
   *   },
   * });
   * ```
   */
  environment?: { [key: string]: string };

  /**
   * When running `sst start`, a placeholder site is deployed. This is to ensure
   * that the site content remains unchanged, and subsequent `sst start` can
   * start up quickly.
   *
   * @example
   * ```js {3}
   * new RemixSite(stack, "RemixSite", {
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
   * While deploying, SST waits for the CloudFront cache invalidation process to
   * finish. This ensures that the new content will be served once the deploy
   * command finishes. However, this process can sometimes take more than 5
   * mins. For non-prod environments it might make sense to pass in `false`.
   * That'll skip waiting for the cache to invalidate and speed up the deploy
   * process.
   */
  waitForInvalidation?: boolean;
}

/**
 * The `RemixSite` construct is a higher level CDK construct that makes it easy
 * to create a Remix app.
 *
 * It provides a simple way to build and deploy the site to CloudFront, the
 * server running on `Lambda@Edge`, with the browser build and public statics
 * backed by an S3 Bucket. In addition to this it supports environment variables
 * against your `Lambda@Edge` function, despite this being a limitation with the
 * AWS feature. CloudFront cache policies are implemented, along with cache
 * invalidation on deployment.
 *
 * The construct enables you to customize many of the deployment features,
 * including the ability to configure a custom domain for the website URL.
 *
 * It also allows you to [automatically set the environment
 * variables](#configuring-environment-variables) in your Remix app directly
 * from the outputs in your SST app.
 */
export class RemixSite extends Construct implements SSTConstruct {
  /**
   * The default CloudFront cache policy properties for browser build files.
   */
  public static browserBuildCachePolicyProps: cloudfront.CachePolicyProps = {
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
    comment: "SST RemixSite Browser Build Default Cache Policy",
  };

  /**
   * The default CloudFront cache policy properties for "public" folder
   * static files.
   *
   * Note: This will not include the browser build files, which have a seperate
   * cache policy; @see `browserBuildCachePolicyProps`.
   */
  public static publicCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    defaultTtl: Duration.hours(1),
    maxTtl: Duration.hours(1),
    minTtl: Duration.hours(1),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST RemixSite Public Folder Default Cache Policy",
  };

  /**
   * The default CloudFront cache policy properties for responses from the
   * server rendering Lambda.
   */
  public static serverResponseCachePolicyProps: cloudfront.CachePolicyProps = {
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    defaultTtl: Duration.seconds(0),
    maxTtl: Duration.days(365),
    minTtl: Duration.seconds(0),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
    comment: "SST RemixSite Server Response Default Cache Policy",
  };

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
    /**
     * The AWS Certificate Manager certificate for the custom domain.
     */
    certificate?: acm.ICertificate;
  };
  private props: RemixSiteProps;
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
  /**
   * S3Asset references to the zip files containing the static files for the
   * deployment.
   */
  private deploymentStaticsS3Assets: s3Assets.Asset[];
  /**
   * The remix site config. It contains user configuration overrides which we
   * will need to consider when resolving Remix's build output.
   */
  private remixConfig: RemixConfig;
  private serverLambdaRole: iam.Role;
  private serverLambdaVersion: lambda.IVersion;
  private awsCliLayer: AwsCliLayer;

  constructor(scope: Construct, id: string, props: RemixSiteProps) {
    super(scope, id);

    try {
      const app = scope.node.root as App;
      const zipFileSizeLimitInMb = 200;

      this.isPlaceholder =
        (app.local || app.skipBuild) && !props.disablePlaceholder;
      this.sstBuildDir = app.buildDir;
      this.props = props;
      this.cdk = {} as any;
      this.awsCliLayer = new AwsCliLayer(this, "AwsCliLayer");
      this.registerSiteEnvironment();

      // Prepare app
      if (this.isPlaceholder) {
        // Minimal configuration for the placeholder site
        this.remixConfig = {} as any;
        this.deploymentStaticsS3Assets = this.zipAppStubAssets();
      } else {
        // Validate application exists
        if (!fs.existsSync(props.path)) {
          throw new Error(`No path found`);
        }

        // Build the Remix site (only if not running an SST test)
        // @ts-expect-error: "sstTest" is only passed in by SST tests
        if (!props.sstTest) {
          this.buildApp();
        }

        // Read the remix config as we need to ensure we are utilising
        // any user defined overrides for the Remix build output.
        this.remixConfig = this.readRemixConfig();

        const serverBuildFile = path.join(
          this.props.path,
          this.remixConfig.serverBuildPath
        );

        // Validate server build output exists
        if (!fs.existsSync(serverBuildFile)) {
          throw new Error(
            `No server build output found at "${serverBuildFile}"`
          );
        }

        // Create a directory that we will use to create the bundled version
        // of the "core server build" along with our custom Lamba@Edge handler.
        const deploymentWorkingDir = path.join(this.props.path, ".sst");
        if (fs.existsSync(deploymentWorkingDir)) {
          fs.removeSync(deploymentWorkingDir);
        }
        fs.mkdirSync(deploymentWorkingDir);

        // Create the server lambda code bundle
        this.createServerBundle();

        // Create S3 assets from the browser build
        this.deploymentStaticsS3Assets =
          this.createStaticsS3Assets(zipFileSizeLimitInMb);
      }

      // Create Bucket which will be utilised to contain the statics
      this.cdk.bucket = this.createS3Bucket();

      // Create Lambda@Edge functions (always created in us-east-1)
      this.serverLambdaRole = this.createServerFunctionRole();
      this.serverLambdaVersion = this.createServerFunction();

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
    } catch (error) {
      // If running an SST test then re-throw the error so that it can be
      // tested
      // @ts-expect-error: "sstTest" is only passed in by SST tests
      if (props.sstTest) {
        throw error;
      }

      console.error(
        chalk.red(
          `\nError: There was a problem synthesizing the RemixSite at "${props.path}".`
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

  // #region Public properties

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

  // #endregion

  // #region Public methods

  /**
   * Attaches the given list of permissions to allow the Remix server side
   * rendering to access other AWS resources.
   *
   * @example
   * ### Attaching permissions
   *
   * ```js {5}
   * const site = new RemixSite(stack, "Site", {
   *   path: "path/to/site",
   * });
   *
   * site.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    attachPermissionsToRole(this.serverLambdaRole, permissions);
  }

  public getConstructMetadata() {
    return {
      type: "RemixSite" as const,
      data: {
        distributionId: this.cdk.distribution.distributionId,
        customDomainUrl: this.customDomainUrl,
      },
    };
  }

  // #endregion

  // #region Building and Bundling

  private buildApp() {
    // Given that Remix apps tend to involve concatenation of other commands
    // such as Tailwind compilation, we feel that it is safest to target the
    // "build" script for the app in order to ensure all outputs are generated.

    const { path: sitePath } = this.props;

    // validate site path exists
    if (!fs.existsSync(sitePath)) {
      throw new Error(`No path found at "${path.resolve(sitePath)}"`);
    }

    // Ensure that the site has a build script defined
    if (!fs.existsSync(path.join(sitePath, "package.json"))) {
      throw new Error(`No package.json found at "${sitePath}".`);
    }
    const packageJson = readPackageSync({
      cwd: sitePath,
      normalize: false,
    });
    if (!packageJson.scripts || !packageJson.scripts.build) {
      throw new Error(
        `No "build" script found within package.json in "${sitePath}".`
      );
    }

    // Run build
    this.logInfo(`Running "build" script`);
    const buildResult = spawn.sync("npm", ["run", "build"], {
      cwd: sitePath,
      stdio: "inherit",
      env: {
        ...process.env,
        ...getBuildCmdEnvironment(this.props.environment),
      },
    });
    if (buildResult.status !== 0) {
      throw new Error('The app "build" script failed.');
    }
  }

  // #endregion

  // #region Statics

  private createStaticsS3Assets(fileSizeLimit: number): s3Assets.Asset[] {
    // First we need to create zip files containing the statics

    const script = path.resolve(__dirname, "../assets/BaseSite/archiver.cjs");
    const zipOutDir = path.resolve(
      path.join(this.sstBuildDir, `RemixSite-${this.node.id}-${this.node.addr}`)
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

  private zipAppStubAssets(): s3Assets.Asset[] {
    return [
      new s3Assets.Asset(this, "Asset", {
        path: path.resolve(__dirname, "../assets/RemixSite/site-sub"),
      }),
    ];
  }

  private createS3Bucket(): s3.Bucket {
    const { cdk } = this.props;

    return new s3.Bucket(this, "S3Bucket", {
      publicReadAccess: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      ...cdk?.bucket,
    });
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
    this.deploymentStaticsS3Assets.forEach((asset) =>
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

    const publicPath = path.join(this.props.path, "public");
    const publicFileOptions = [];
    for (const item of fs.readdirSync(publicPath)) {
      const itemPath = path.join(publicPath, item);
      publicFileOptions.push({
        exclude: "*",
        include: fs.statSync(itemPath).isDirectory()
          ? `/${item}/*`
          : `/${item}`,
        cacheControl: "public,max-age=31536000,must-revalidate",
      });
    }

    // Create custom resource
    const fileOptions = [
      {
        exclude: "*",
        include: `${this.remixConfig.publicPath}*`,
        cacheControl: "public,max-age=31536000,must-revalidate",
      },
      ...publicFileOptions,
    ];
    return new CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: this.deploymentStaticsS3Assets.map((asset) => ({
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

  // #endregion

  // #region Server Lambda

  private createServerBundle() {
    // Create a Lambda@Edge handler for the Remix server bundle.
    //
    // Note: Remix does perform their own internal ESBuild process, but it
    // doesn't bundle 3rd party dependencies by default. In the interest of
    // keeping deployments seamless for users we will create a server bundle
    // with all dependencies included. We will still need to consider how to
    // address any need for external dependencies, although I think we should
    // possibly consider this at a later date.

    let serverPath: string;

    if (this.remixConfig.server != null) {
      // In this path we are using a user-specified server. We'll assume
      // that they have built an appropriate CloudFront Lambda@Edge handler
      // for the Remix "core server build".
      //
      // The Remix compiler will have bundled their server implementation into
      // the server build ouput path. We therefore need to reference the
      // serverBuildPath from the remix.config.js to determine our server build
      // entry.
      //
      // Supporting this customisation of the server supports two cases:
      // 1. It enables power users to override our own implementation with an
      //    implementation that meets their specific needs.
      // 2. It provides us with the required stepping stone to enable a
      //    "Serverless Stack" template within the Remix repository (we would
      //    still need to reach out to the Remix team for this).

      serverPath = this.remixConfig.serverBuildPath;
    } else {
      // In this path we are assuming that the Remix build only outputs the
      // "core server build". We can safely assume this as we have guarded the
      // remix.config.js to ensure it matches our expectations for the build
      // configuration.
      // We need to ensure that the "core server build" is wrapped with an
      // appropriate Lambda@Edge handler. We will utilise an internal asset
      // template to create this wrapper within the "core server build" output
      // directory.

      this.logInfo(`Creating Lambda@Edge handler for server`);

      // Read in our lambda template file
      const serverTemplate = fs.readFileSync(
        path.resolve(
          __dirname,
          "../assets/RemixSite/server/server-template.js"
        ),
        "utf-8"
      );

      // Resolve the path to create the server lambda handler at.
      serverPath = path.join(this.props.path, "build/server.js");

      // Write the server lambda
      fs.writeFileSync(serverPath, serverTemplate, "utf-8");
    }

    this.logInfo(`Bundling server`);

    const bundleResult = spawn.sync(
      "npx",
      [
        `--no-install`,
        `esbuild`,
        `--bundle`,
        serverPath,
        `--target=node16`,
        `--platform=node`,
        `--outfile=${path.join(this.props.path, ".sst/server.js")}`,
        `--external:aws-sdk`,
      ],
      { stdio: "inherit" }
    );

    if (bundleResult.error != null) {
      throw new Error(`There was a problem bundling the server.`);
    }
  }

  private createServerFunctionRole(): iam.Role {
    const { defaults } = this.props;

    // Create function role
    const role = new iam.Role(this, `ServerLambdaRole`, {
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
    if (defaults?.function?.permissions) {
      attachPermissionsToRole(role, defaults.function.permissions);
    }

    return role;
  }

  private createServerFunction(): lambda.IVersion {
    const name = "Server";

    const assetPath = this.isPlaceholder
      ? path.resolve(__dirname, "../assets/RemixSite/server-lambda-stub")
      : path.join(this.props.path, ".sst");

    // Create function asset
    const asset = new s3Assets.Asset(this, `ServerFunctionAsset`, {
      path: assetPath,
    });

    // Create function based on region
    const root = this.node.root as App;
    return root.region === "us-east-1"
      ? this.createServerFunctionInUE1(name, asset, assetPath)
      : this.createServerFunctionInNonUE1(name, asset, assetPath);
  }

  private createServerFunctionInUE1(
    name: string,
    asset: s3Assets.Asset,
    assetPath: string
  ): lambda.IVersion {
    const { defaults } = this.props;

    // Create function
    const fn = new lambda.Function(this, `${name}Function`, {
      description: `${name} handler for Remix`,
      handler: "server.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(assetPath),
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: defaults?.function?.memorySize || 512,
      timeout: Duration.seconds(defaults?.function?.timeout || 10),
      role: this.serverLambdaRole,
    });

    // Create alias
    fn.currentVersion.addAlias("live");

    // Deploy after the code is updated
    if (!this.isPlaceholder) {
      const updaterCR = this.createLambdaCodeReplacer(name, asset);
      fn.node.addDependency(updaterCR);
    }

    return fn.currentVersion;
  }

  private createServerFunctionInNonUE1(
    name: string,
    asset: s3Assets.Asset,
    _assetPath: string
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
      this.serverLambdaRole,
      bucketName,
      {
        Description: `${name} handler for Remix`,
        Handler: "server.handler",
        Code: {
          S3Bucket: asset.s3BucketName,
          S3Key: asset.s3ObjectKey,
        },
        Runtime: lambda.Runtime.NODEJS_16_X.name,
        MemorySize: defaults?.function?.memorySize || 512,
        Timeout: Duration.seconds(
          defaults?.function?.timeout || 10
        ).toSeconds(),
        Role: this.serverLambdaRole.roleArn,
      }
    );
    const functionArn = functionCR.getAttString("FunctionArn");

    // Create a Lambda function version in us-east-1
    const versionCR = crossRegionHelper.createVersion(this, name, functionArn);
    const versionId = versionCR.getAttString("Version");
    crossRegionHelper.updateVersionLogicalId(functionCR, versionCR);

    // Deploy after the code is updated
    if (!this.isPlaceholder) {
      const updaterCR = this.createLambdaCodeReplacer(name, asset);
      functionCR.node.addDependency(updaterCR);
    }

    return lambda.Version.fromVersionArn(
      this,
      `${name}FunctionVersion`,
      `${functionArn}:${versionId}`
    );
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
          // TODO: Move this file into a shared folder
          // This references a Nextjs directory, but the underlying
          // code appears to be generic enough to utilise in this case.
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

  private getLambdaContentReplaceValues(): BaseSiteReplaceProps[] {
    const replaceValues: BaseSiteReplaceProps[] = [];

    replaceValues.push({
      files: "**/*.js",
      search: '"{{ _SST_REMIX_SITE_ENVIRONMENT_ }}"',
      replace: JSON.stringify(this.props.environment || {}),
    });

    return replaceValues;
  }

  // #endregion

  // #region CloudFront Distribution

  private createCloudFrontDistribution(): cloudfront.Distribution {
    const { cdk, customDomain } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    // Validate input
    if (cfDistributionProps.certificate) {
      throw new Error(
        `Do not configure the "cfDistribution.certificate". Use the "customDomain" to configure the RemixSite domain certificate.`
      );
    }
    if (cfDistributionProps.domainNames) {
      throw new Error(
        `Do not configure the "cfDistribution.domainNames". Use the "customDomain" to configure the RemixSite domain.`
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
        functionVersion: this.serverLambdaVersion,
      },
      {
        eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
        functionVersion: this.serverLambdaVersion,
      },
    ];

    // Build cache policies
    const browserBuildCachePolicy =
      cdk?.cachePolicies?.browserBuildCachePolicy ??
      this.createCloudFrontBrowserBuildAssetsCachePolicy();
    const publicCachePolicy =
      cdk?.cachePolicies?.publicCachePolicy ??
      this.createCloudFrontPublicCachePolicy();
    const serverResponseCachePolicy =
      cdk?.cachePolicies?.serverResponseCachePolicy ??
      this.createCloudFrontServerResponseCachePolicy();

    // Behaviour options for public assets
    const publicBehaviourOptions: cloudfront.BehaviorOptions = {
      viewerProtocolPolicy,
      origin,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: publicCachePolicy,
    };

    // Create additional behaviours for statics
    const publicPath = path.join(this.props.path, "public");
    const staticsBehaviours: Record<string, cloudfront.BehaviorOptions> = {};
    for (const item of fs.readdirSync(publicPath)) {
      if (item === "build") {
        // This is the browser build, so it will have its own cache policy
        staticsBehaviours["/build/*"] = {
          ...publicBehaviourOptions,
          cachePolicy: browserBuildCachePolicy,
        };
      } else {
        // This is a public asset, so it will use the public cache policy
        const itemPath = path.join(publicPath, item);
        staticsBehaviours[
          fs.statSync(itemPath).isDirectory() ? `/${item}/*` : `/${item}`
        ] = publicBehaviourOptions;
      }
    }

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
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: serverResponseCachePolicy,
        ...(cfDistributionProps.defaultBehavior || {}),
        // concatenate edgeLambdas
        edgeLambdas: [
          ...edgeLambdas,
          ...(cfDistributionProps.defaultBehavior?.edgeLambdas || []),
        ],
      },
      additionalBehaviors: {
        ...staticsBehaviours,
        ...(cfDistributionProps.additionalBehaviors || {}),
      },
    });
  }

  private createCloudFrontBrowserBuildAssetsCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "BrowserBuildAssetsCache",
      RemixSite.browserBuildCachePolicyProps
    );
  }

  private createCloudFrontPublicCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "PublicAssetsCache",
      RemixSite.publicCachePolicyProps
    );
  }

  private createCloudFrontServerResponseCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(
      this,
      "ServerResponseCache",
      RemixSite.serverResponseCachePolicyProps
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

    // We need a versionId so that CR gets updated on each deploy
    let versionId: string | undefined;
    if (this.isPlaceholder) {
      versionId = "live";
    } else {
      // We will generate a hash based on the contents of the "public" folder
      // which will be used to indicate if we need to invalidate our CloudFront
      // cache. As the browser build files are always uniquely hash in their
      // filenames according to their content we can ignore the browser build
      // files.

      const result = spawn.sync("node", [
        path.resolve(__dirname, "../assets/nodejs/folder-hash.cjs"),
        "--path",
        path.resolve(this.props.path, "public"),
        // Ignore the browser build files;
        "--ignore",
        "build",
      ]);
      if (result.error != null) {
        throw new Error(
          `Failed to to create version hash for "public" directory.\n${result.error}`
        );
      }
      if (result.status !== 0) {
        throw new Error(
          `Failed to to create version hash for "public" directory.\n${result.stderr}`
        );
      }
      versionId = result.stdout.toString();
      if (versionId == null) {
        throw new Error(
          `Could not resolve the versionId hash for the Remix "public" dir.`
        );
      }

      this.logInfo(`CloudFront invalidation version: ${versionId}`);
    }

    const waitForInvalidation =
      this.props.waitForInvalidation === false ? false : true;

    return new CustomResource(this, "CloudFrontInvalidation", {
      serviceToken: invalidator.functionArn,
      resourceType: "Custom::SSTCloudFrontInvalidation",
      properties: {
        BuildId: versionId,
        DistributionId: this.cdk.distribution.distributionId,
        // TODO: Ignore the browser build path as it may speed up invalidation
        DistributionPaths: ["/*"],
        WaitForInvalidation: waitForInvalidation,
      },
    });
  }

  // #endregion

  // #region Custom Domain

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

  // #endregion

  // #region Helper Functions

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

  private readRemixConfig(): RemixConfig {
    const { path: sitePath } = this.props;

    const result = spawn.sync("node", [
      path.resolve(
        __dirname,
        "../assets/RemixSite/config/read-remix-config.cjs"
      ),
      "--path",
      path.resolve(sitePath, "remix.config.js"),
    ]);
    if (result.error != null) {
      throw new Error(`Failed to read the Remix config file.\n${result.error}`);
    }
    if (result.status !== 0) {
      throw new Error(
        `Failed to read the Remix config file.\n${result.stderr}`
      );
    }
    const output = result.stdout.toString();

    const remixConfigParse = expectedRemixConfigSchema.safeParse(
      JSON.parse(output)
    );
    if (remixConfigParse.success === false) {
      throw new Error(
        `\nYour remix.config.js has invalid values.

It needs to use the default Remix config values for the following properties:

module.exports ={
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  serverBuildTarget: "node-cjs",
  server: undefined,
}
`
      );
    }
    return remixConfigParse.data;
  }

  private logInfo(msg: string) {
    console.log(chalk.grey(`RemixSite(${this.props.path}): ${msg}`));
  }

  // #endregion
}
