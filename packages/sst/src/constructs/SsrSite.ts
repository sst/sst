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
  Effect,
  Role,
  Policy,
  PolicyStatement,
  AccountPrincipal,
  ServicePrincipal,
  CompositePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  Function as CdkFunction,
  Code,
  Runtime,
  FunctionUrlAuthType,
  FunctionProps as CdkFunctionProps,
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
  OriginRequestPolicy,
  IOriginRequestPolicy,
  Function as CfFunction,
  FunctionCode as CfFunctionCode,
  FunctionEventType as CfFunctionEventType,
  ErrorResponse,
} from "aws-cdk-lib/aws-cloudfront";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import {
  S3Origin,
  HttpOrigin,
  OriginGroup,
} from "aws-cdk-lib/aws-cloudfront-origins";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Distribution, DistributionDomainProps } from "./Distribution.js";
import { Logger } from "../logger.js";
import { createAppContext } from "./context.js";
import { SSTConstruct, isCDKConstruct } from "./Construct.js";
import { NodeJSProps, FunctionProps } from "./Function.js";
import { Secret } from "./Secret.js";
import { SsrFunction, SsrFunctionProps } from "./SsrFunction.js";
import { EdgeFunction, EdgeFunctionProps } from "./EdgeFunction.js";
import {
  BaseSiteFileOptions,
  BaseSiteReplaceProps,
  BaseSiteCdkDistributionProps,
  getBuildCmdEnvironment,
} from "./BaseSite.js";
import { Size } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import {
  FunctionBindingProps,
  getParameterPath,
} from "./util/functionBinding.js";
import { useProject } from "../project.js";
import { VisibleError } from "../error.js";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type CloudFrontFunctionConfig = { constructId: string; injections: string[] };
type EdgeFunctionConfig = { constructId: string; function: EdgeFunctionProps };
type FunctionOriginConfig = {
  type: "function";
  constructId: string;
  function: SsrFunctionProps;
  streaming?: boolean;
};
type ImageOptimizationFunctionOriginConfig = {
  type: "image-optimization-function";
  function: CdkFunctionProps;
};
type S3OriginConfig = {
  type: "s3";
  originPath?: string;
  copy: {
    from: string;
    to: string;
    cached: boolean;
    versionedSubDir?: string;
  }[];
};
type OriginGroupConfig = {
  type: "group";
  primaryOriginName: string;
  fallbackOriginName: string;
  fallbackStatusCodes?: number[];
};
type OriginsMap = Record<string, S3Origin | HttpOrigin | OriginGroup>;

export type Plan = ReturnType<SsrSite["validatePlan"]>;
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
   * Path relative to the app location where the type definitions are located.
   * @default "."
   */
  typesPath?: string;
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
  /**
   * The number of server functions to keep warm. This option is only supported for the regional mode.
   * @default Server function is not kept warm
   */
  warm?: number;
  regional?: {
    /**
     * Secure the server function URL using AWS IAM authentication. By default, the server function URL is publicly accessible. When this flag is enabled, the server function URL will require IAM authorization, and a Lambda@Edge function will sign the requests. Be aware that this introduces added latency to the requests.
     * @default false
     */
    enableServerUrlIamAuth?: boolean;
  };
  dev?: {
    /**
     * When running `sst dev`, site is not deployed. This is to ensure `sst dev` can start up quickly.
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
     * Allows you to override default settings this construct uses internally to create the bucket
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
     * @default
     * By default, the cache policy is configured to cache all responses from
     * the server rendering Lambda based on the query-key only. If you're using
     * cookie or header based authentication, you'll need to override the
     * cache policy to cache based on those values as well.
     *
     * ```js
     * serverCachePolicy: new CachePolicy(this, "ServerCache", {
     *   queryStringBehavior: CacheQueryStringBehavior.all()
     *   headerBehavior: CacheHeaderBehavior.none()
     *   cookieBehavior: CacheCookieBehavior.none()
     *   defaultTtl: Duration.days(0)
     *   maxTtl: Duration.days(365)
     *   minTtl: Duration.days(0)
     * })
     * ```
     */
    serverCachePolicy?: ICachePolicy;
    /**
     * Override the CloudFront response headers policy properties for responses
     * from the server rendering Lambda.
     */
    responseHeadersPolicy?: IResponseHeadersPolicy;
    server?: Pick<
      CdkFunctionProps,
      | "vpc"
      | "vpcSubnets"
      | "securityGroups"
      | "allowAllOutbound"
      | "allowPublicSubnet"
      | "architecture"
      | "logRetention"
    > &
      Pick<FunctionProps, "copyFiles">;
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

export type SsrSiteNormalizedProps = SsrSiteProps & {
  path: Exclude<SsrSiteProps["path"], undefined>;
  typesPath: Exclude<SsrSiteProps["typesPath"], undefined>;
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
  protected bucket: Bucket;
  protected serverFunction?: EdgeFunction | SsrFunction;
  private serverFunctionForDev?: SsrFunction;
  private distribution: Distribution;

  constructor(scope: Construct, id: string, rawProps?: SsrSiteProps) {
    super(scope, rawProps?.cdk?.id || id);

    const props: SsrSiteNormalizedProps = {
      path: ".",
      typesPath: ".",
      waitForInvalidation: false,
      runtime: "nodejs18.x",
      timeout: "10 seconds",
      memorySize: "1024 MB",
      ...rawProps,
    };
    this.id = id;
    this.props = props;

    const app = scope.node.root as App;
    const stack = Stack.of(this) as Stack;
    const self = this;
    const {
      path: sitePath,
      typesPath,
      buildCommand,
      runtime,
      timeout,
      memorySize,
      edge,
      regional,
      dev,
      nodejs,
      permissions,
      environment,
      bind,
      customDomain,
      waitForInvalidation,
      fileOptions,
      warm,
      cdk,
    } = props;

    this.doNotDeploy = !stack.isActive || (app.mode === "dev" && !dev?.deploy);

    validateSiteExists();
    validateTimeout();
    writeTypesFile(typesPath);

    useSites().add(stack.stackName, id, this.constructor.name, props);

    if (this.doNotDeploy) {
      // @ts-expect-error
      this.bucket = this.distribution = null;
      this.serverFunctionForDev = createServerFunctionForDev();
      app.registerTypes(this);
      return;
    }

    let s3DeployCRs: CustomResource[] = [];
    let ssrFunctions: SsrFunction[] = [];
    let singletonAwsCliLayer: AwsCliLayer;
    let singletonUrlSigner: EdgeFunction;
    let singletonCachePolicy: CachePolicy;
    let singletonOriginRequestPolicy: IOriginRequestPolicy;

    // Create Bucket
    const bucket = createS3Bucket();

    // Build app
    buildApp();
    const plan = this.plan(bucket);

    // Create CloudFront
    const cfFunctions = createCloudFrontFunctions();
    const edgeFunctions = createEdgeFunctions();
    const origins = createOrigins();
    const distribution = createCloudFrontDistribution();
    distribution.createInvalidation(plan.buildId ?? generateBuildId());

    // Create Warmer
    createWarmer();

    this.bucket = bucket;
    this.distribution = distribution;
    this.serverFunction =
      ssrFunctions.length > 0
        ? ssrFunctions[0]
        : Object.values(edgeFunctions).length > 0
        ? Object.values(edgeFunctions)[0]
        : undefined;

    app.registerTypes(this);

    function validateSiteExists() {
      if (!fs.existsSync(sitePath)) {
        throw new Error(`No site found at "${path.resolve(sitePath)}"`);
      }
    }

    function validateTimeout() {
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

    function writeTypesFile(typesPath: string) {
      const filePath = path.resolve(sitePath, typesPath, "sst-env.d.ts");

      // Do not override the types file if it already exists
      if (fs.existsSync(filePath)) return;

      const relPathToSstTypesFile = path.join(
        path.relative(path.dirname(filePath), useProject().paths.root),
        ".sst/types/index.ts"
      );
      fs.writeFileSync(
        filePath,
        `/// <reference path="${relPathToSstTypesFile}" />`
      );
    }

    function buildApp() {
      if (app.isRunningSSTTest()) return;

      const defaultCommand = "npm run build";
      const cmd = buildCommand || defaultCommand;

      if (cmd === defaultCommand) {
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
      Logger.debug(`Running "${cmd}" script`);
      try {
        execSync(cmd, {
          cwd: sitePath,
          stdio: "inherit",
          env: {
            SST: "1",
            ...process.env,
            ...getBuildCmdEnvironment(environment),
          },
        });
      } catch (e) {
        throw new VisibleError(
          `There was a problem building the "${id}" site.`
        );
      }
    }

    function createS3Bucket() {
      // cdk.bucket is an imported construct
      if (cdk?.bucket && isCDKConstruct(cdk?.bucket)) {
        return cdk.bucket as Bucket;
      }

      // cdk.bucket is a prop
      return new Bucket(self, "S3Bucket", {
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
        enforceSSL: true,
        ...cdk?.bucket,
      });
    }

    function createServerFunctionForDev() {
      const role = new Role(self, "ServerFunctionRole", {
        assumedBy: new CompositePrincipal(
          new AccountPrincipal(app.account),
          new ServicePrincipal("lambda.amazonaws.com")
        ),
        maxSessionDuration: CdkDuration.hours(12),
      });

      return new SsrFunction(self, `ServerFunction`, {
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
    }

    function createWarmer() {
      // note: Currently all sites have a single server function. When we add
      //       support for multiple server functions (ie. route splitting), we
      //       need to handle warming multiple functions.
      if (!warm) return;

      if (warm && edge) {
        throw new VisibleError(
          `In the "${id}" Site, warming is currently supported only for the regional mode.`
        );
      }

      if (ssrFunctions.length === 0) return;

      // Create warmer function
      const warmer = new CdkFunction(self, "WarmerFunction", {
        description: "SSR warmer",
        code: Code.fromAsset(
          plan.warmerConfig?.function ??
            path.join(__dirname, "../support/ssr-warmer")
        ),
        runtime: Runtime.NODEJS_18_X,
        handler: "index.handler",
        timeout: CdkDuration.minutes(15),
        memorySize: 128,
        environment: {
          FUNCTION_NAME: ssrFunctions[0].functionName,
          CONCURRENCY: warm.toString(),
        },
      });
      ssrFunctions[0].grantInvoke(warmer);

      // Create cron job
      new Rule(self, "WarmerRule", {
        schedule:
          plan.warmerConfig?.schedule ?? Schedule.rate(CdkDuration.minutes(5)),
        targets: [new LambdaFunction(warmer, { retryAttempts: 0 })],
      });

      // Create custom resource to prewarm on deploy
      const policy = new Policy(self, "PrewarmerPolicy", {
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["lambda:InvokeFunction"],
            resources: [warmer.functionArn],
          }),
        ],
      });
      stack.customResourceHandler.role?.attachInlinePolicy(policy);
      const resource = new CustomResource(self, "Prewarmer", {
        serviceToken: stack.customResourceHandler.functionArn,
        resourceType: "Custom::FunctionInvoker",
        properties: {
          version: Date.now().toString(),
          functionName: warmer.functionName,
        },
      });
      resource.node.addDependency(policy);
    }

    function createCloudFrontDistribution() {
      const distribution = new Distribution(self, "CDN", {
        scopeOverride: self,
        customDomain,
        waitForInvalidation,
        cdk: {
          distribution: {
            // these values can be overwritten
            defaultRootObject: "",
            // override props.
            ...cdk?.distribution,
            // these values can NOT be overwritten
            defaultBehavior: buildBehavior(
              plan.behaviors.find((behavior) => !behavior.pattern)!
            ),
            additionalBehaviors: {
              ...plan.behaviors
                .filter((behavior) => behavior.pattern)
                .reduce((acc, behavior) => {
                  acc[behavior.pattern!] = buildBehavior(behavior);
                  return acc;
                }, {} as Record<string, BehaviorOptions>),
              ...(cdk?.distribution?.additionalBehaviors || {}),
            },
            errorResponses: plan.errorResponses,
          },
        },
      });

      // allow all functions to invalidate the distribution
      const policy = new Policy(self, "ServerFunctionInvalidatorPolicy", {
        statements: [
          new PolicyStatement({
            actions: ["cloudfront:CreateInvalidation"],
            resources: [
              `arn:${stack.partition}:cloudfront::${stack.account}:distribution/${distribution.cdk.distribution.distributionId}`,
            ],
          }),
        ],
      });
      ssrFunctions.forEach((fn) => fn.role?.attachInlinePolicy(policy));
      Object.values(edgeFunctions).forEach((fn) =>
        fn.role?.attachInlinePolicy(policy)
      );

      // create distribution after s3 upload finishes
      s3DeployCRs.forEach((cr) => distribution.node.addDependency(cr));

      return distribution;
    }

    function buildBehavior(
      behavior: ReturnType<typeof self.validatePlan>["behaviors"][number]
    ) {
      const origin = origins[behavior.origin];
      const edgeFunction = edgeFunctions[behavior.edgeFunction || ""];
      const cfFunction = cfFunctions[behavior.cfFunction || ""];

      if (behavior.cacheType === "static") {
        return {
          origin,
          allowedMethods:
            behavior.allowedMethods ?? AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: cdk?.distribution?.defaultBehavior?.viewerProtocolPolicy ?? ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: cdk?.responseHeadersPolicy,
          functionAssociations: cfFunction
            ? [
                {
                  eventType: CfFunctionEventType.VIEWER_REQUEST,
                  function: cfFunction,
                },
              ]
            : undefined,
        };
      } else if (behavior.cacheType === "server") {
        return {
          viewerProtocolPolicy: cdk?.distribution?.defaultBehavior?.viewerProtocolPolicy ?? ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          origin,
          allowedMethods: behavior.allowedMethods ?? AllowedMethods.ALLOW_ALL,
          cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: cdk?.serverCachePolicy ?? useServerBehaviorCachePolicy(),
          responseHeadersPolicy: cdk?.responseHeadersPolicy,
          originRequestPolicy: useServerBehaviorOriginRequestPolicy(),
          ...(cdk?.distribution?.defaultBehavior || {}),
          functionAssociations: [
            ...(cfFunction
              ? [
                  {
                    eventType: CfFunctionEventType.VIEWER_REQUEST,
                    function: cfFunction,
                  },
                ]
              : []),
            ...(cdk?.distribution?.defaultBehavior?.functionAssociations || []),
          ],
          edgeLambdas: [
            ...(edgeFunction
              ? [
                  {
                    includeBody: true,
                    eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
                    functionVersion: edgeFunction.currentVersion,
                  },
                ]
              : []),
            ...(regional?.enableServerUrlIamAuth
              ? [
                  {
                    includeBody: true,
                    eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
                    functionVersion:
                      useFunctionUrlSigningFunction().currentVersion,
                  },
                ]
              : []),
            ...(cdk?.distribution?.defaultBehavior?.edgeLambdas || []),
          ],
        };
      }

      throw new Error(`Invalid behavior type in the "${id}" site.`);
    }

    function createCloudFrontFunctions() {
      const functions: Record<string, CfFunction> = {};

      Object.entries(plan.cloudFrontFunctions ?? {}).forEach(
        ([name, { constructId, injections }]) => {
          functions[name] = new CfFunction(self, constructId, {
            code: CfFunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  ${injections.join("\n")}
  return request;
}`),
          });
        }
      );
      return functions;
    }

    function createEdgeFunctions() {
      const functions: Record<string, EdgeFunction> = {};

      Object.entries(plan.edgeFunctions ?? {}).forEach(
        ([name, { constructId, function: props }]) => {
          const fn = new EdgeFunction(self, constructId, {
            runtime,
            timeout,
            memorySize,
            bind,
            permissions,
            ...props,
            nodejs: {
              format: "esm" as const,
              ...nodejs,
              ...props.nodejs,
              esbuild: {
                ...nodejs?.esbuild,
                ...props.nodejs?.esbuild,
              },
            },
            environment: {
              ...environment,
              ...props.environment,
            },
          });

          bucket.grantReadWrite(fn.role!);
          functions[name] = fn;
        }
      );
      return functions;
    }

    function createS3Origin(props: S3OriginConfig) {
      const s3Origin = new S3Origin(bucket, {
        originPath: "/" + (props.originPath ?? ""),
      });

      const assets = createS3OriginAssets(props.copy);
      const assetFileOptions =
        fileOptions || createS3OriginAssetFileOptions(props.copy);
      const s3deployCR = createS3OriginDeployment(assets, assetFileOptions);
      s3DeployCRs.push(s3deployCR);

      return s3Origin;
    }

    function createFunctionOrigin(props: FunctionOriginConfig) {
      const fn = new SsrFunction(self, props.constructId, {
        runtime,
        timeout,
        memorySize,
        bind,
        permissions,
        ...props.function,
        nodejs: {
          format: "esm" as const,
          ...nodejs,
          ...props.function.nodejs,
          esbuild: {
            ...nodejs?.esbuild,
            ...props.function.nodejs?.esbuild,
          },
        },
        environment: {
          ...environment,
          ...props.function.environment,
        },
        ...cdk?.server,
      });
      ssrFunctions.push(fn);

      bucket.grantReadWrite(fn?.role!);

      const fnUrl = fn.addFunctionUrl({
        authType: regional?.enableServerUrlIamAuth
          ? FunctionUrlAuthType.AWS_IAM
          : FunctionUrlAuthType.NONE,
        invokeMode: props.streaming
          ? InvokeMode.RESPONSE_STREAM
          : InvokeMode.BUFFERED,
      });
      if (regional?.enableServerUrlIamAuth) {
        useFunctionUrlSigningFunction().attachPermissions([
          new PolicyStatement({
            actions: ["lambda:InvokeFunctionUrl"],
            resources: [fn.functionArn],
          }),
        ]);
      }

      return new HttpOrigin(Fn.parseDomainName(fnUrl.url), {
        readTimeout:
          typeof timeout === "string"
            ? toCdkDuration(timeout)
            : CdkDuration.seconds(timeout),
      });
    }

    function createOriginGroup(props: OriginGroupConfig, origins: OriginsMap) {
      return new OriginGroup({
        primaryOrigin: origins[props.primaryOriginName],
        fallbackOrigin: origins[props.fallbackOriginName],
        fallbackStatusCodes: props.fallbackStatusCodes,
      });
    }

    function createImageOptimizationFunctionOrigin(
      props: ImageOptimizationFunctionOriginConfig
    ) {
      const fn = new CdkFunction(self, `ImageFunction`, {
        currentVersionOptions: {
          removalPolicy: RemovalPolicy.DESTROY,
        },
        logRetention: RetentionDays.THREE_DAYS,
        timeout: CdkDuration.seconds(25),
        initialPolicy: [
          new PolicyStatement({
            actions: ["s3:GetObject"],
            resources: [bucket.arnForObjects("*")],
          }),
        ],
        ...props.function,
      });

      const fnUrl = fn.addFunctionUrl({
        authType: regional?.enableServerUrlIamAuth
          ? FunctionUrlAuthType.AWS_IAM
          : FunctionUrlAuthType.NONE,
      });
      if (regional?.enableServerUrlIamAuth) {
        useFunctionUrlSigningFunction().attachPermissions([
          new PolicyStatement({
            actions: ["lambda:InvokeFunctionUrl"],
            resources: [fn.functionArn],
          }),
        ]);
      }

      return new HttpOrigin(Fn.parseDomainName(fnUrl.url));
    }

    function createOrigins() {
      const origins: OriginsMap = {};

      // Create non-group origins
      Object.entries(plan.origins ?? {}).forEach(([name, props]) => {
        switch (props.type) {
          case "s3":
            origins[name] = createS3Origin(props);
            break;
          case "function":
            origins[name] = createFunctionOrigin(props);
            break;
          case "image-optimization-function":
            origins[name] = createImageOptimizationFunctionOrigin(props);
            break;
        }
      });

      // Create group origins
      Object.entries(plan.origins ?? {}).forEach(([name, props]) => {
        if (props.type === "group") {
          origins[name] = createOriginGroup(props, origins);
        }
      });

      return origins;
    }

    function createS3OriginAssets(copy: S3OriginConfig["copy"]) {
      // Create temp folder, clean up if exists
      const zipOutDir = path.resolve(
        path.join(useProject().paths.artifacts, `Site-${id}-${self.node.addr}`)
      );
      fs.rmSync(zipOutDir, { recursive: true, force: true });

      // Create zip files
      const script = path.resolve(
        __dirname,
        "../support/base-site-archiver.mjs"
      );
      const fileSizeLimit = app.isRunningSSTTest()
        ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
          props.sstTestFileSizeLimitOverride || 200
        : 200;
      const result = spawn.sync(
        "node",
        [
          script,
          Buffer.from(
            JSON.stringify(
              copy.map((files) => ({
                src: path.join(sitePath, files.from),
                tar: files.to,
              }))
            )
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
          new Asset(self, `Asset${partId}`, {
            path: zipFilePath,
          })
        );
      }
      return assets;
    }

    function createS3OriginAssetFileOptions(copy: S3OriginConfig["copy"]) {
      const fileOptions = [];

      for (const files of copy) {
        if (!files.cached) continue;

        const filesPath = path.join(sitePath, files.from);

        for (const item of fs.readdirSync(filesPath)) {
          const itemPath = path.join(filesPath, item);
          const isDir = fs.statSync(itemPath).isDirectory();
          fileOptions.push({
            exclude: "*",
            include: path.posix.join(files.to, item, isDir ? "*" : ""),
            cacheControl:
              item === files.versionedSubDir
                ? // Versioned files will be cached for 1 year (immutable) both at
                  // the CDN and browser level.
                  "public,max-age=31536000,immutable"
                : // Un-versioned files will be cached for 1 year at the CDN level.
                  // But not at the browser level. CDN cache will be invalidated on deploy.
                  "public,max-age=0,s-maxage=31536000,must-revalidate",
          });
        }
      }

      return fileOptions;
    }

    function createS3OriginDeployment(
      assets: Asset[],
      fileOptions: SsrSiteFileOptions[]
    ): CustomResource {
      // Create a Lambda function that will be doing the uploading
      const uploader = new CdkFunction(self, "S3Uploader", {
        code: Code.fromAsset(
          path.join(__dirname, "../support/base-site-custom-resource")
        ),
        layers: [useAwsCliLayer()],
        runtime: Runtime.PYTHON_3_11,
        handler: "s3-upload.handler",
        timeout: CdkDuration.minutes(15),
        memorySize: 1024,
      });
      bucket.grantReadWrite(uploader);
      assets.forEach((asset) => asset.grantRead(uploader));

      // Create the custom resource function
      const handler = new CdkFunction(self, "S3Handler", {
        code: Code.fromAsset(
          path.join(__dirname, "../support/base-site-custom-resource")
        ),
        layers: [useAwsCliLayer()],
        runtime: Runtime.PYTHON_3_11,
        handler: "s3-handler.handler",
        timeout: CdkDuration.minutes(15),
        memorySize: 1024,
        environment: {
          UPLOADER_FUNCTION_NAME: uploader.functionName,
        },
      });
      bucket.grantReadWrite(handler);
      uploader.grantInvoke(handler);

      // Create custom resource
      return new CustomResource(self, "S3Deployment", {
        serviceToken: handler.functionArn,
        resourceType: "Custom::SSTBucketDeployment",
        properties: {
          Sources: assets.map((asset) => ({
            BucketName: asset.s3BucketName,
            ObjectKey: asset.s3ObjectKey,
          })),
          DestinationBucketName: bucket.bucketName,
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
          ReplaceValues: getS3ContentReplaceValues(),
        },
      });
    }

    function useFunctionUrlSigningFunction() {
      singletonUrlSigner =
        singletonUrlSigner ??
        new EdgeFunction(self, "ServerUrlSigningFunction", {
          bundle: path.join(__dirname, "../support/signing-function"),
          runtime: "nodejs18.x",
          handler: "index.handler",
          timeout: 10,
          memorySize: 128,
        });
      return singletonUrlSigner;
    }

    function useServerBehaviorCachePolicy() {
      const allowedHeaders = plan.cachePolicyAllowedHeaders || [];
      singletonCachePolicy =
        singletonCachePolicy ??
        new CachePolicy(self, "ServerCache", {
          queryStringBehavior: CacheQueryStringBehavior.all(),
          headerBehavior:
            allowedHeaders.length > 0
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
      return singletonCachePolicy;
    }

    function useServerBehaviorOriginRequestPolicy() {
      // CloudFront's Managed-AllViewerExceptHostHeader policy
      singletonOriginRequestPolicy =
        singletonOriginRequestPolicy ??
        OriginRequestPolicy.fromOriginRequestPolicyId(
          self,
          "ServerOriginRequestPolicy",
          "b689b0a8-53d0-40ab-baf2-68738e2966ac"
        );
      return singletonOriginRequestPolicy;
    }

    function useAwsCliLayer() {
      singletonAwsCliLayer =
        singletonAwsCliLayer ?? new AwsCliLayer(self, "AwsCliLayer");
      return singletonAwsCliLayer;
    }

    function getS3ContentReplaceValues() {
      const replaceValues: SsrSiteReplaceProps[] = [];

      Object.entries(environment || {})
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

    function generateBuildId(): string {
      // We will generate a hash based on the contents of the S3 files with cache enabled.
      // This will be used to determine if we need to invalidate our CloudFront cache.
      const s3Origin = Object.values(plan.origins).find(
        (origin) => origin.type === "s3"
      );
      if (s3Origin?.type !== "s3") return "unchanged";
      const cachedS3Files = s3Origin.copy.find((item) => item.cached);
      if (!cachedS3Files) return "unchanged";

      // The below options are needed to support following symlinks when building zip files:
      // - nodir: This will prevent symlinks themselves from being copied into the zip.
      // - follow: This will follow symlinks and copy the files within.
      const globOptions = {
        dot: true,
        nodir: true,
        follow: true,
        cwd: path.resolve(sitePath, cachedS3Files.from),
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
      function: this.serverFunction?.function,
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
    const server = this.serverFunction || this.serverFunctionForDev;
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
        runtime: this.props.runtime,
        customDomainUrl: this.customDomainUrl,
        url: this.url,
        edge: this.props.edge,
        server: (this.serverFunctionForDev || this.serverFunction)
          ?.functionArn!,
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

  protected useCloudFrontFunctionHostHeaderInjection() {
    return `request.headers["x-forwarded-host"] = request.headers.host;`;
  }

  protected abstract plan(bucket: Bucket): ReturnType<typeof this.validatePlan>;

  protected validatePlan<
    CloudFrontFunctions extends Record<string, CloudFrontFunctionConfig>,
    EdgeFunctions extends Record<string, EdgeFunctionConfig>,
    Origins extends Record<
      string,
      | FunctionOriginConfig
      | ImageOptimizationFunctionOriginConfig
      | S3OriginConfig
      | OriginGroupConfig
    >
  >(input: {
    cloudFrontFunctions?: CloudFrontFunctions;
    edgeFunctions?: EdgeFunctions;
    origins: Origins;
    behaviors: {
      cacheType: "server" | "static";
      pattern?: string;
      origin: keyof Origins;
      allowedMethods?: AllowedMethods;
      cfFunction?: keyof CloudFrontFunctions;
      edgeFunction?: keyof EdgeFunctions;
    }[];
    errorResponses?: ErrorResponse[];
    cachePolicyAllowedHeaders?: string[];
    buildId?: string;
    warmerConfig?: {
      function: string;
      schedule?: Schedule;
    };
  }) {
    return input;
  }
}

export const useSites = createAppContext(() => {
  const sites: {
    stack: string;
    name: string;
    type: string;
    props: SsrSiteNormalizedProps;
  }[] = [];
  return {
    add(
      stack: string,
      name: string,
      type: string,
      props: SsrSiteNormalizedProps
    ) {
      sites.push({ stack, name, type, props });
    },
    get all() {
      return sites;
    },
  };
});
