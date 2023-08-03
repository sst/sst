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
  Token,
  Duration as CdkDuration,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib/core";
import {
  BlockPublicAccess,
  Bucket,
  BucketProps,
  IBucket,
} from "aws-cdk-lib/aws-s3";
import {
  Role,
  Policy,
  PolicyStatement,
  AccountPrincipal,
  ServicePrincipal,
  CompositePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  Function as CdkFunction,
  IFunction as ICdkFunction,
  Code,
  Runtime,
  FunctionUrlAuthType,
  FunctionProps,
  InvokeMode,
} from "aws-cdk-lib/aws-lambda";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import {
  ICachePolicy,
  IResponseHeadersPolicy,
  BehaviorOptions,
  ViewerProtocolPolicy,
  AllowedMethods,
  CachedMethods,
  LambdaEdgeEventType,
  CachePolicy,
  CacheQueryStringBehavior,
  CacheHeaderBehavior,
  CacheCookieBehavior,
  Distribution as CdkDistribution,
  OriginRequestPolicy,
  Function as CfFunction,
  FunctionCode as CfFunctionCode,
  FunctionEventType as CfFunctionEventType,
} from "aws-cdk-lib/aws-cloudfront";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import { S3Origin, HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Distribution, DistributionDomainProps } from "./Distribution.js";
import { Logger } from "../logger.js";
import { createAppContext } from "./context.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";
import { NodeJSProps } from "./Function.js";
import { Secret } from "./Secret.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";
import {
  BaseSiteFileOptions,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  getBuildCmdEnvironment,
} from "./BaseSite.js";
import { useDeferredTasks } from "./deferred_task.js";
import { Size } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import {
  FunctionBindingProps,
  getParameterPath,
} from "./util/functionBinding.js";
import { useProject } from "../project.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export type SsrBuildConfig = {
  typesPath: string;
  serverBuildOutputFile: string;
  serverCFFunctionInjection?: string;
  clientBuildOutputDir: string;
  clientBuildVersionedSubDir: string;
  clientBuildS3KeyPrefix?: string;
  prerenderedBuildOutputDir?: string;
  prerenderedBuildS3KeyPrefix?: string;
};

export interface SsrSiteNodeJSProps extends NodeJSProps {}
export interface SsrDomainProps extends DistributionDomainProps {}
export interface SsrSiteFileOptions extends BaseSiteFileOptions {}
export interface SsrSiteReplaceProps extends BaseSiteReplaceProps {}
export interface SsrCdkDistributionProps extends BaseSiteCdkDistributionProps {}
export interface SsrSiteProps {
  /**
   * Bind resources for the function
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   bind: [STRIPE_KEY, bucket],
   * })
   * ```
   */
  bind?: SSTConstruct[];
  /**
   * Path to the directory where the app is located.
   * @default "."
   */
  path?: string;
  /**
   * The command for building the website
   * @default `npm run build`
   * @example
   * ```js
   * buildCommand: "yarn build",
   * ```
   */
  buildCommand?: string;
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
   * The SSR function is deployed to Lambda in a single region. Alternatively, you can enable this option to deploy to Lambda@Edge.
   * @default false
   */
  edge?: boolean;
  /**
   * The execution timeout in seconds for SSR function.
   * @default 10 seconds
   * @example
   * ```js
   * timeout: "5 seconds",
   * ```
   */
  timeout?: number | Duration;
  /**
   * The amount of memory in MB allocated for SSR function.
   * @default 1024 MB
   * @example
   * ```js
   * memorySize: "512 MB",
   * ```
   */
  memorySize?: number | Size;
  /**
   * The runtime environment for the SSR function.
   * @default nodejs18.x
   * @example
   * ```js
   * runtime: "nodejs16.x",
   * ```
   */
  runtime?: "nodejs14.x" | "nodejs16.x" | "nodejs18.x";
  /**
   * Used to configure nodejs function properties
   */
  nodejs?: SsrSiteNodeJSProps;
  /**
   * Attaches the given list of permissions to the SSR function. Configuring this property is equivalent to calling `attachPermissions()` after the site is created.
   * @example
   * ```js
   * permissions: ["ses"]
   * ```
   */
  permissions?: Permissions;
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
  dev?: {
    /**
     * When running `sst dev, site is not deployed. This is to ensure `sst dev` can start up quickly.
     * @default false
     * @example
     * ```js
     * dev: {
     *   deploy: true
     * }
     * ```
     */
    deploy?: boolean;
    /**
     * The local site URL when running `sst dev`.
     * @example
     * ```js
     * dev: {
     *   url: "http://localhost:3000"
     * }
     * ```
     */
    url?: string;
  };
  /**
   * While deploying, SST waits for the CloudFront cache invalidation process to finish. This ensures that the new content will be served once the deploy command finishes. However, this process can sometimes take more than 5 mins. For non-prod environments it might make sense to pass in `false`. That'll skip waiting for the cache to invalidate and speed up the deploy process.
   * @default false
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
    bucket?: BucketProps | IBucket;
    /**
     * Pass in a value to override the default settings this construct uses to
     * create the CDK `Distribution` internally.
     */
    distribution?: SsrCdkDistributionProps;
    /**
     * Override the CloudFront cache policy properties for responses from the
     * server rendering Lambda.
     *
     * @note The default cache policy that is used in the abscene of this property
     * is one that performs no caching of the server response.
     */
    serverCachePolicy?: ICachePolicy;
    /**
     * Override the CloudFront response headers policy properties for responses
     * from the server rendering Lambda.
     */
    responseHeadersPolicy?: IResponseHeadersPolicy;
    server?: Pick<
      FunctionProps,
      | "vpc"
      | "vpcSubnets"
      | "securityGroups"
      | "allowAllOutbound"
      | "allowPublicSubnet"
      | "architecture"
      | "logRetention"
    >;
  };
  /**
   * Pass in a list of file options to customize cache control and content type specific files.
   *
   * @default
   * Versioned files cached for 1 year at the CDN and brower level.
   * Unversioned files cached for 1 year at the CDN level, but not at the browser level.
   * ```js
   * fileOptions: [
   *   {
   *     exclude: "*",
   *     include: "{versioned_directory}/*",
   *     cacheControl: "public,max-age=31536000,immutable",
   *   },
   *   {
   *     exclude: "*",
   *     include: "[{non_versioned_file1}, {non_versioned_file2}, ...]",
   *     cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
   *   },
   *   {
   *     exclude: "*",
   *     include: "[{non_versioned_dir_1}/*, {non_versioned_dir_2}/*, ...]",
   *     cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
   *   },
   * ]
   * ```
   *
   * @example
   * ```js
   * fileOptions: [
   *   {
   *     exclude: "*",
   *     include: "{versioned_directory}/*.css",
   *     cacheControl: "public,max-age=31536000,immutable",
   *     contentType: "text/css; charset=UTF-8",
   *   },
   *   {
   *     exclude: "*",
   *     include: "{versioned_directory}/*.js",
   *     cacheControl: "public,max-age=31536000,immutable",
   *   },
   *   {
   *     exclude: "*",
   *     include: "[{non_versioned_file1}, {non_versioned_file2}, ...]",
   *     cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
   *   },
   *   {
   *     exclude: "*",
   *     include: "[{non_versioned_dir_1}/*, {non_versioned_dir_2}/*, ...]",
   *     cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
   *   },
   * ]
   * ```
   */
  fileOptions?: SsrSiteFileOptions[];
}

type SsrSiteNormalizedProps = SsrSiteProps & {
  path: Exclude<SsrSiteProps["path"], undefined>;
  runtime: Exclude<SsrSiteProps["runtime"], undefined>;
  timeout: Exclude<SsrSiteProps["timeout"], undefined>;
  memorySize: Exclude<SsrSiteProps["memorySize"], undefined>;
  waitForInvalidation: Exclude<SsrSiteProps["waitForInvalidation"], undefined>;
};

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
export abstract class SsrSite extends Construct implements SSTConstruct {
  public readonly id: string;
  protected props: SsrSiteNormalizedProps;
  protected doNotDeploy: boolean;
  protected buildConfig: SsrBuildConfig;
  protected deferredTaskCallbacks: (() => void)[] = [];
  protected serverLambdaForEdge?: EdgeFunction;
  protected serverLambdaForRegional?: SsrFunction;
  private serverLambdaForDev?: SsrFunction;
  protected bucket: Bucket;
  private cfFunction: CfFunction;
  private s3Origin: S3Origin;
  private distribution: Distribution;

  constructor(scope: Construct, id: string, props?: SsrSiteProps) {
    super(scope, props?.cdk?.id || id);

    const app = scope.node.root as App;
    const stack = Stack.of(this) as Stack;
    this.id = id;
    this.props = {
      path: ".",
      waitForInvalidation: false,
      runtime: "nodejs18.x",
      timeout: "10 seconds",
      memorySize: "1024 MB",
      ...props,
    };
    this.doNotDeploy =
      !stack.isActive || (app.mode === "dev" && !this.props.dev?.deploy);

    this.buildConfig = this.initBuildConfig();
    this.validateSiteExists();
    this.validateTimeout();
    this.writeTypesFile();

    useSites().add(id, this.constructor.name, this.props);

    if (this.doNotDeploy) {
      // @ts-ignore
      this.cfFunction = this.bucket = this.s3Origin = this.distribution = null;
      this.serverLambdaForDev = this.createFunctionForDev();
      return;
    }

    // Create Bucket which will be utilised to contain the statics
    this.bucket = this.createS3Bucket();

    // Create Server functions
    if (this.props.edge) {
      this.serverLambdaForEdge = this.createFunctionForEdge();
    } else {
      this.serverLambdaForRegional = this.createFunctionForRegional();
    }
    this.grantServerS3Permissions();

    // Create CloudFront
    this.s3Origin = this.createCloudFrontS3Origin();
    this.cfFunction = this.createCloudFrontFunction();
    this.distribution = this.props.edge
      ? this.createCloudFrontDistributionForEdge()
      : this.createCloudFrontDistributionForRegional();
    this.grantServerCloudFrontPermissions();

    useDeferredTasks().add(async () => {
      // Build app
      this.buildApp();

      // Build server functions
      await this.serverLambdaForEdge?.build();
      await this.serverLambdaForRegional?.build();

      // Create S3 Deployment
      const cliLayer = new AwsCliLayer(this, "AwsCliLayer");
      const assets = this.createS3Assets();
      const assetFileOptions = this.createS3AssetFileOptions();
      const s3deployCR = this.createS3Deployment(
        cliLayer,
        assets,
        assetFileOptions
      );
      this.distribution.node.addDependency(s3deployCR);

      // Add static file behaviors
      this.addStaticFileBehaviors();

      // Invalidate CloudFront
      this.distribution.createInvalidation(this.generateBuildId());

      for (const task of this.deferredTaskCallbacks) {
        await task();
      }
    });
  }

  /////////////////////
  // Public Properties
  /////////////////////

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    if (this.doNotDeploy) return this.props.dev?.url;

    return this.distribution.url;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get customDomainUrl() {
    if (this.doNotDeploy) return;

    return this.distribution.customDomainUrl;
  }

  /**
   * The internally created CDK resources.
   */
  public get cdk() {
    if (this.doNotDeploy) return;

    return {
      function:
        this.serverLambdaForEdge?.function ||
        this.serverLambdaForRegional?.function,
      bucket: this.bucket,
      distribution: this.distribution.cdk.distribution,
      hostedZone: this.distribution.cdk.hostedZone,
      certificate: this.distribution.cdk.certificate,
    };
  }

  /////////////////////
  // Public Methods
  /////////////////////

  /**
   * Attaches the given list of permissions to allow the server side
   * rendering framework to access other AWS resources.
   *
   * @example
   * ```js
   * site.attachPermissions(["sns"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    const server =
      this.serverLambdaForEdge ||
      this.serverLambdaForRegional ||
      this.serverLambdaForDev;
    attachPermissionsToRole(server?.role as Role, permissions);
  }

  /** @internal */
  protected getConstructMetadataBase() {
    return {
      data: {
        mode: this.doNotDeploy
          ? ("placeholder" as const)
          : ("deployed" as const),
        path: this.props.path,
        customDomainUrl: this.customDomainUrl,
        url: this.url,
        edge: this.props.edge,
        server: (
          this.serverLambdaForDev ||
          this.serverLambdaForRegional ||
          this.serverLambdaForEdge
        )?.functionArn!,
        secrets: (this.props.bind || [])
          .filter((c) => c instanceof Secret)
          .map((c) => (c as Secret).name),
      },
    };
  }

  public abstract getConstructMetadata(): ReturnType<
    SSTConstruct["getConstructMetadata"]
  >;

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    const app = this.node.root as App;
    return {
      clientPackage: "site",
      variables: {
        url: this.doNotDeploy
          ? {
              type: "plain",
              value: this.props.dev?.url ?? "localhost",
            }
          : {
              // Do not set real value b/c we don't want to make the Lambda function
              // depend on the Site. B/c often the site depends on the Api, causing
              // a CloudFormation circular dependency if the Api and the Site belong
              // to different stacks.
              type: "site_url",
              value: this.customDomainUrl || this.url!,
            },
      },
      permissions: {
        "ssm:GetParameters": [
          `arn:${Stack.of(this).partition}:ssm:${app.region}:${
            app.account
          }:parameter${getParameterPath(this, "url")}`,
        ],
      },
    };
  }

  /////////////////////
  // Build App
  /////////////////////

  protected initBuildConfig(): SsrBuildConfig {
    return {
      typesPath: ".",
      serverBuildOutputFile: "placeholder",
      clientBuildOutputDir: "placeholder",
      clientBuildVersionedSubDir: "placeholder",
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
    const {
      path: sitePath,
      buildCommand: rawBuildCommand,
      environment,
    } = this.props;
    const defaultCommand = "npm run build";
    const buildCommand = rawBuildCommand || defaultCommand;

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
          SST: "1",
          ...process.env,
          ...getBuildCmdEnvironment(environment),
        },
      });
    } catch (e) {
      throw new Error(
        `There was a problem building the "${this.node.id}" site.`
      );
    }
  }

  /////////////////////
  // Bundle S3 Assets
  /////////////////////

  private createS3Assets(): Asset[] {
    // Create temp folder, clean up if exists
    const zipOutDir = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `Site-${this.node.id}-${this.node.addr}`
      )
    );
    fs.rmSync(zipOutDir, { recursive: true, force: true });

    // Create zip files
    const app = this.node.root as App;
    const script = path.resolve(__dirname, "../support/base-site-archiver.mjs");
    const fileSizeLimit = app.isRunningSSTTest()
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
        this.props.sstTestFileSizeLimitOverride || 200
      : 200;
    const result = spawn.sync(
      "node",
      [
        script,
        Buffer.from(
          JSON.stringify([
            {
              src: path.join(
                this.props.path,
                this.buildConfig.clientBuildOutputDir
              ),
              tar: this.buildConfig.clientBuildS3KeyPrefix || "",
            },
            ...(this.buildConfig.prerenderedBuildOutputDir
              ? [
                  {
                    src: path.join(
                      this.props.path,
                      this.buildConfig.prerenderedBuildOutputDir
                    ),
                    tar: this.buildConfig.prerenderedBuildS3KeyPrefix || "",
                  },
                ]
              : []),
          ])
        ).toString("base64"),
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
        new Asset(this, `Asset${partId}`, {
          path: zipFilePath,
        })
      );
    }
    return assets;
  }

  private createS3AssetFileOptions() {
    if (this.props.fileOptions) return this.props.fileOptions;

    // Build file options
    const fileOptions = [];
    const clientPath = path.join(
      this.props.path,
      this.buildConfig.clientBuildOutputDir
    );
    for (const item of fs.readdirSync(clientPath)) {
      // Versioned files will be cached for 1 year (immutable) both at
      // the CDN and browser level.
      if (item === this.buildConfig.clientBuildVersionedSubDir) {
        fileOptions.push({
          exclude: "*",
          include: path.posix.join(
            this.buildConfig.clientBuildS3KeyPrefix ?? "",
            this.buildConfig.clientBuildVersionedSubDir,
            "*"
          ),
          cacheControl: "public,max-age=31536000,immutable",
        });
      }
      // Un-versioned files will be cached for 1 year at the CDN level.
      // But not at the browser level. CDN cache will be invalidated on deploy.
      else {
        const itemPath = path.join(clientPath, item);
        fileOptions.push({
          exclude: "*",
          include: path.posix.join(
            this.buildConfig.clientBuildS3KeyPrefix ?? "",
            item,
            fs.statSync(itemPath).isDirectory() ? "*" : ""
          ),
          cacheControl: "public,max-age=0,s-maxage=31536000,must-revalidate",
        });
      }
    }
    return fileOptions;
  }

  private createS3Bucket(): Bucket {
    const { cdk } = this.props;

    // cdk.bucket is an imported construct
    if (cdk?.bucket && isCDKConstruct(cdk?.bucket)) {
      return cdk.bucket as Bucket;
    }

    // cdk.bucket is a prop
    return new Bucket(this, "S3Bucket", {
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      ...cdk?.bucket,
    });
  }

  private createS3Deployment(
    cliLayer: AwsCliLayer,
    assets: Asset[],
    fileOptions: SsrSiteFileOptions[]
  ): CustomResource {
    // Create a Lambda function that will be doing the uploading
    const uploader = new CdkFunction(this, "S3Uploader", {
      code: Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
      ),
      layers: [cliLayer],
      runtime: Runtime.PYTHON_3_7,
      handler: "s3-upload.handler",
      timeout: CdkDuration.minutes(15),
      memorySize: 1024,
    });
    this.bucket.grantReadWrite(uploader);
    assets.forEach((asset) => asset.grantRead(uploader));

    // Create the custom resource function
    const handler = new CdkFunction(this, "S3Handler", {
      code: Code.fromAsset(
        path.join(__dirname, "../support/base-site-custom-resource")
      ),
      layers: [cliLayer],
      runtime: Runtime.PYTHON_3_7,
      handler: "s3-handler.handler",
      timeout: CdkDuration.minutes(15),
      memorySize: 1024,
      environment: {
        UPLOADER_FUNCTION_NAME: uploader.functionName,
      },
    });
    this.bucket.grantReadWrite(handler);
    uploader.grantInvoke(handler);

    // Create custom resource
    return new CustomResource(this, "S3Deployment", {
      serviceToken: handler.functionArn,
      resourceType: "Custom::SSTBucketDeployment",
      properties: {
        Sources: assets.map((asset) => ({
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        })),
        DestinationBucketName: this.bucket.bucketName,
        FileOptions: (fileOptions || []).map(
          ({ exclude, include, cacheControl, contentType }) => {
            if (typeof exclude === "string") {
              exclude = [exclude];
            }
            if (typeof include === "string") {
              include = [include];
            }
            return [
              ...exclude.map((per) => ["--exclude", per]),
              ...include.map((per) => ["--include", per]),
              ["--cache-control", cacheControl],
              contentType ? ["--content-type", contentType] : [],
            ].flat();
          }
        ),
        ReplaceValues: this.getS3ContentReplaceValues(),
      },
    });
  }

  /////////////////////
  // Bundle Lambda Server
  /////////////////////

  protected createFunctionForRegional() {
    return {} as SsrFunction;
  }

  protected createFunctionForEdge() {
    return {} as EdgeFunction;
  }

  protected createFunctionForDev() {
    const { runtime, timeout, memorySize, permissions, environment, bind } =
      this.props;

    const app = this.node.root as App;
    const role = new Role(this, "ServerFunctionRole", {
      assumedBy: new CompositePrincipal(
        new AccountPrincipal(app.account),
        new ServicePrincipal("lambda.amazonaws.com")
      ),
      maxSessionDuration: CdkDuration.hours(12),
    });

    const ssrFn = new SsrFunction(this, `ServerFunction`, {
      description: "Server handler placeholder",
      bundle: path.join(__dirname, "../support/ssr-site-function-stub"),
      handler: "index.handler",
      runtime,
      memorySize,
      timeout,
      role,
      bind,
      environment,
      permissions,
      // note: do not need to set vpc settings b/c this function is not being used
    });

    useDeferredTasks().add(async () => {
      await ssrFn.build();
    });

    return ssrFn;
  }

  private grantServerS3Permissions() {
    const server = this.serverLambdaForEdge || this.serverLambdaForRegional;
    this.bucket.grantReadWrite(server!.role!);
  }

  private grantServerCloudFrontPermissions() {
    const stack = Stack.of(this) as Stack;
    const server = this.serverLambdaForEdge || this.serverLambdaForRegional;
    const policy = new Policy(this, "ServerFunctionInvalidatorPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["cloudfront:CreateInvalidation"],
          resources: [
            `arn:${stack.partition}:cloudfront::${stack.account}:distribution/${this.distribution.cdk.distribution.distributionId}`,
          ],
        }),
      ],
    });
    server?.role?.attachInlinePolicy(policy);
  }

  /////////////////////
  // CloudFront Distribution
  /////////////////////

  private createCloudFrontS3Origin() {
    return new S3Origin(this.bucket, {
      originPath: "/" + (this.buildConfig.clientBuildS3KeyPrefix ?? ""),
    });
  }

  private createCloudFrontFunction() {
    return new CfFunction(this, "CloudFrontFunction", {
      code: CfFunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  request.headers["x-forwarded-host"] = request.headers.host;
  ${this.buildConfig.serverCFFunctionInjection || ""}
  return request;
}`),
    });
  }

  protected createCloudFrontDistributionForRegional() {
    const { customDomain, cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const cachePolicy = cdk?.serverCachePolicy ?? this.buildServerCachePolicy();

    return new Distribution(this, "CDN", {
      scopeOverride: this,
      customDomain,
      cdk: {
        distribution: {
          // these values can be overwritten by cfDistributionProps
          defaultRootObject: "",
          // Override props.
          ...cfDistributionProps,
          // these values can NOT be overwritten by cfDistributionProps
          defaultBehavior: this.buildDefaultBehaviorForRegional(cachePolicy),
          additionalBehaviors: {
            ...(cfDistributionProps.additionalBehaviors || {}),
          },
        },
      },
    });
  }

  protected createCloudFrontDistributionForEdge() {
    const { customDomain, cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};
    const cachePolicy = cdk?.serverCachePolicy ?? this.buildServerCachePolicy();

    return new Distribution(this, "CDN", {
      scopeOverride: this,
      customDomain,
      cdk: {
        distribution: {
          // these values can be overwritten by cfDistributionProps
          defaultRootObject: "",
          // Override props.
          ...cfDistributionProps,
          // these values can NOT be overwritten by cfDistributionProps
          defaultBehavior: this.buildDefaultBehaviorForEdge(cachePolicy),
          additionalBehaviors: {
            ...(cfDistributionProps.additionalBehaviors || {}),
          },
        },
      },
    });
  }

  protected buildDefaultBehaviorForRegional(
    cachePolicy: ICachePolicy
  ): BehaviorOptions {
    const { timeout, cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    // TODO
    console.log({ support: this.supportsStreaming() });
    const fnUrl = this.serverLambdaForRegional!.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      invokeMode: this.supportsStreaming()
        ? InvokeMode.RESPONSE_STREAM
        : undefined,
    });

    return {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new HttpOrigin(Fn.parseDomainName(fnUrl.url), {
        readTimeout:
          typeof timeout === "string"
            ? toCdkDuration(timeout)
            : CdkDuration.seconds(timeout),
      }),
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
      originRequestPolicy: this.buildServerOriginRequestPolicy(),
      ...(cfDistributionProps.defaultBehavior || {}),
      functionAssociations: [
        ...this.buildBehaviorFunctionAssociations(),
        ...(cfDistributionProps.defaultBehavior?.functionAssociations || []),
      ],
    };
  }

  protected buildDefaultBehaviorForEdge(
    cachePolicy: ICachePolicy
  ): BehaviorOptions {
    const { cdk } = this.props;
    const cfDistributionProps = cdk?.distribution || {};

    return {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: this.s3Origin,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      responseHeadersPolicy: cdk?.responseHeadersPolicy,
      originRequestPolicy: this.buildServerOriginRequestPolicy(),
      ...(cfDistributionProps.defaultBehavior || {}),
      functionAssociations: [
        ...this.buildBehaviorFunctionAssociations(),
        ...(cfDistributionProps.defaultBehavior?.functionAssociations || []),
      ],
      edgeLambdas: [
        {
          includeBody: true,
          eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
          functionVersion: this.serverLambdaForEdge!.currentVersion,
        },
        ...(cfDistributionProps.defaultBehavior?.edgeLambdas || []),
      ],
    };
  }

  protected buildBehaviorFunctionAssociations() {
    return [
      {
        eventType: CfFunctionEventType.VIEWER_REQUEST,
        function: this.cfFunction,
      },
    ];
  }

  protected addStaticFileBehaviors() {
    const { cdk } = this.props;

    // Create a template for statics behaviours
    const publicDir = path.join(
      this.props.path,
      this.buildConfig.clientBuildOutputDir
    );
    for (const item of fs.readdirSync(publicDir)) {
      const isDir = fs.statSync(path.join(publicDir, item)).isDirectory();
      (this.distribution.cdk.distribution as CdkDistribution).addBehavior(
        isDir ? `${item}/*` : item,
        this.s3Origin,
        {
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: cdk?.responseHeadersPolicy,
        }
      );
    }
  }

  protected buildServerCachePolicy(allowedHeaders?: string[]) {
    return new CachePolicy(this, "ServerCache", {
      queryStringBehavior: CacheQueryStringBehavior.all(),
      headerBehavior:
        allowedHeaders && allowedHeaders.length > 0
          ? CacheHeaderBehavior.allowList(...allowedHeaders)
          : CacheHeaderBehavior.none(),
      cookieBehavior: CacheCookieBehavior.none(),
      defaultTtl: CdkDuration.days(0),
      maxTtl: CdkDuration.days(365),
      minTtl: CdkDuration.days(0),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      comment: "SST server response cache policy",
    });
  }

  protected buildServerOriginRequestPolicy() {
    // CloudFront's Managed-AllViewerExceptHostHeader policy
    return OriginRequestPolicy.fromOriginRequestPolicyId(
      this,
      "ServerOriginRequestPolicy",
      "b689b0a8-53d0-40ab-baf2-68738e2966ac"
    );
  }

  /////////////////////
  // Helper Functions
  /////////////////////

  private getS3ContentReplaceValues() {
    const replaceValues: SsrSiteReplaceProps[] = [];

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

  private validateSiteExists() {
    const { path: sitePath } = this.props;
    if (!fs.existsSync(sitePath)) {
      throw new Error(`No site found at "${path.resolve(sitePath)}"`);
    }
  }

  private validateTimeout() {
    const { edge, timeout } = this.props;
    const num =
      typeof timeout === "number"
        ? timeout
        : toCdkDuration(timeout).toSeconds();
    const limit = edge ? 30 : 180;
    if (num > limit) {
      throw new Error(
        edge
          ? `Timeout must be less than or equal to 30 seconds when the "edge" flag is enabled.`
          : `Timeout must be less than or equal to 180 seconds.`
      );
    }
  }

  private writeTypesFile() {
    const typesPath = path.resolve(
      this.props.path,
      this.buildConfig.typesPath,
      "sst-env.d.ts"
    );

    // Do not override the types file if it already exists
    if (fs.existsSync(typesPath)) return;

    const relPathToSstTypesFile = path.join(
      path.relative(path.dirname(typesPath), useProject().paths.root),
      ".sst/types/index.ts"
    );
    fs.writeFileSync(
      typesPath,
      `/// <reference path="${relPathToSstTypesFile}" />`
    );
  }

  protected generateBuildId(): string {
    // We will generate a hash based on the contents of the "public" folder
    // which will be used to indicate if we need to invalidate our CloudFront
    // cache.

    // The below options are needed to support following symlinks when building zip files:
    // - nodir: This will prevent symlinks themselves from being copied into the zip.
    // - follow: This will follow symlinks and copy the files within.
    const globOptions = {
      dot: true,
      nodir: true,
      follow: true,
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

  protected supportsStreaming(): boolean {
    return false;
  }
}

export const useSites = createAppContext(() => {
  const sites: {
    name: string;
    type: string;
    props: SsrSiteNormalizedProps;
  }[] = [];
  return {
    add(name: string, type: string, props: SsrSiteNormalizedProps) {
      sites.push({ name, type, props });
    },
    get all() {
      return sites;
    },
  };
});
