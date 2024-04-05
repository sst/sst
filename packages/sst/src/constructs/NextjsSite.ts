import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { globSync } from "glob";
import { Construct } from "constructs";
import {
  Duration as CdkDuration,
  RemovalPolicy,
  CustomResource,
  Fn,
} from "aws-cdk-lib/core";
import {
  Code,
  Runtime,
  Function as CdkFunction,
  FunctionProps as CdkFunctionProps,
  Architecture,
} from "aws-cdk-lib/aws-lambda";
import {
  AttributeType,
  Billing,
  TableV2 as Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Stack } from "./Stack.js";
import { EdgeFunctionConfig, FunctionOriginConfig, SsrSite, SsrSiteNormalizedProps, SsrSiteProps } from "./SsrSite.js";
import { Size } from "./util/size.js";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { VisibleError } from "../error.js";
import { CachePolicyProps } from "aws-cdk-lib/aws-cloudfront";
import { SsrFunction } from "./SsrFunction.js";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { useFunctions } from "./Function.js";
import { useDeferredTasks } from "./deferred_task.js";
import { Logger } from "../logger.js";
type BaseFunction = {
  handler: string;
  bundle: string;
};

type OpenNextFunctionOrigin = {
  type: "function";
  streaming?: boolean;
} & BaseFunction;

type OpenNextECSOrigin = {
  type: "ecs";
  bundle: string;
  dockerfile: string;
};

type OpenNextS3Origin = {
  type: "s3";
  originPath: string;
  copy: {
    from: string;
    to: string;
    cached: boolean;
    versionedSubDir?: string;
  }[];
};

type OpenNextOrigins =
  | OpenNextFunctionOrigin
  | OpenNextECSOrigin
  | OpenNextS3Origin;

type BaseOrigins<T extends Record<string, OpenNextOrigins>> = {
  s3: OpenNextS3Origin;
  default: OpenNextFunctionOrigin | OpenNextECSOrigin;
  imageOptimizer: OpenNextFunctionOrigin | OpenNextECSOrigin;
} & T;

type IEdgeFunctions<T extends Record<string, BaseFunction>> = {
  middleware?: BaseFunction
} & T;

interface OpenNextOutput<
  Origins extends BaseOrigins<Record<string, OpenNextOrigins>> = BaseOrigins<{}>,
  EdgeFunctions extends IEdgeFunctions<Record<string, BaseFunction>> = IEdgeFunctions<{}>
> {
  edgeFunctions: EdgeFunctions;
  origins: Origins;
  behaviors: {
    pattern: string;
    origin?: keyof Origins;
    edgeFunction?: keyof EdgeFunctions;
  }[];
  additionalProps?: {
    disableIncrementalCache?: boolean;
    disableTagCache?: boolean;
    initializationFunction?: BaseFunction;
    warmer?: BaseFunction;
    revalidationFunction?: BaseFunction;
  };
}

// Just a subset of the original OpenNextConfig, only needed for properly typing
interface OpenNextFnProps<Override extends {
  generateDockerfile?: boolean;
} = {}> {
  override?: Override;
  placement?: "global" | "regional";
}
interface OpenNextConfig<SplittedFn extends Record<string, OpenNextFnProps> = Record<string, OpenNextFnProps>> {
  default: OpenNextFnProps;
  functions?: SplittedFn;
  middleware?: {
    external: true;
  }
}

type InterpolatedCdkProp = Omit<FunctionOriginConfig['function'], "handler" | "bundle"> & { warm?: number };

type InterpolatedCdkProps<T extends OpenNextConfig> = {
  [K in keyof T['functions']]?: T['functions'] extends Record<string, OpenNextFnProps> ? InterpolatedCdkProp: never
} & {
  default?: InterpolatedCdkProp;
  middleware?: InterpolatedCdkProp;
}

type InterpolatedCdkOutput = CdkFunction

type InterpolatedCdkOutputs<T extends OpenNextConfig> = {
  [K in keyof T["functions"]]: T['functions'] extends Record<string, OpenNextFnProps> ? InterpolatedCdkOutput: never
} & {
  default: InterpolatedCdkOutput;
}

export interface NextjsSiteProps<ONConfig extends OpenNextConfig> extends Omit<SsrSiteProps, "nodejs"> {
  /**
   * OpenNext version for building the Next.js site.
   * @default Latest OpenNext version
   * @example
   * ```js
   * openNextVersion: "2.2.4",
   * ```
   */
  openNextVersion?: string;
  /**
   * How the logs are stored in CloudWatch
   * - "combined" - Logs from all routes are stored in the same log group.
   * - "per-route" - Logs from each route are stored in a separate log group.
   * @default "per-route"
   * @example
   * ```js
   * logging: "combined",
   * ```
   */
  logging?: "combined" | "per-route";
  /**
   * The server function is deployed to Lambda in a single region. Alternatively, you can enable this option to deploy to Lambda@Edge.
   * @default false
   */
  edge?: boolean;
  imageOptimization?: {
    /**
     * The amount of memory in MB allocated for image optimization function.
     * @default 1024 MB
     * @example
     * ```js
     * imageOptimization: {
     *   memorySize: "512 MB",
     * }
     * ```
     */
    memorySize?: number | Size;
  };
  cdk?: SsrSiteProps["cdk"] & {
    revalidation?: Pick<CdkFunctionProps, "vpc" | "vpcSubnets">;
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
     *   headerBehavior: CacheHeaderBehavior.allowList(
     *     "accept",
     *     "rsc",
     *     "next-router-prefetch",
     *     "next-router-state-tree",
     *     "next-url",
     *   ),
     *   cookieBehavior: CacheCookieBehavior.none()
     *   defaultTtl: Duration.days(0)
     *   maxTtl: Duration.days(365)
     *   minTtl: Duration.days(0)
     * })
     * ```
     */
    serverCachePolicy?: NonNullable<SsrSiteProps["cdk"]>["serverCachePolicy"];

    servers?: InterpolatedCdkProps<ONConfig>;

  };
}

const LAYER_VERSION = "2";
const DEFAULT_OPEN_NEXT_VERSION = "2.3.7";
const DEFAULT_CACHE_POLICY_ALLOWED_HEADERS = [
  "x-open-next-cache-key"
];

type NextjsSiteNormalizedProps<ONConfig extends OpenNextConfig> = NextjsSiteProps<ONConfig> & SsrSiteNormalizedProps

/**
 * The `NextjsSite` construct is a higher level CDK construct that makes it easy to create a Next.js app.
 * @example
 * Deploys a Next.js app in the `my-next-app` directory.
 *
 * ```js
 * new NextjsSite(stack, "web", {
 *   path: "my-next-app/",
 * });
 * ```
 */
export class NextjsSite<ONConfig extends OpenNextConfig = OpenNextConfig> extends SsrSite {
  declare props: NextjsSiteNormalizedProps<ONConfig> & {
    openNextOutput: OpenNextOutput
  }
  private _routes?: ({
    route: string;
    logGroupPath: string;
    sourcemapPath?: string;
    sourcemapKey?: string;
  } & ({ regexMatch: string } | { prefixMatch: string }))[];
  private routesManifest?: {
    basePath: string;
    dynamicRoutes: { page: string; regex: string }[];
    staticRoutes: { page: string; regex: string }[];
    dataRoutes?: { page: string; dataRouteRegex: string }[];
  };
  private appPathRoutesManifest?: Record<string, string>;
  private appPathsManifest?: Record<string, string>;
  private pagesManifest?: Record<string, string>;
  private prerenderManifest?: {
    version: number;
    routes: Record<string, unknown>;
  };
  private openNextOutput?: OpenNextOutput;

  constructor(scope: Construct, id: string, rawProps?: NextjsSiteProps<ONConfig>) {
    const props = {
      // Default to combined for now until i figure out how to implement per-route logging
      logging: rawProps?.logging ?? "combined",
      ...rawProps,
    };

    super(scope, id, {
      buildCommand: [
        "npx",
        "--yes",
        `open-next@${props?.openNextVersion ?? DEFAULT_OPEN_NEXT_VERSION}`,
        "build",
      ].join(" "),
      ...props,
    });
    this.openNextOutput = this.props.openNextOutput;

    const disableIncrementalCache = this.openNextOutput?.additionalProps?.disableIncrementalCache ?? false;
    const disableTagCache = this.openNextOutput?.additionalProps?.disableTagCache ?? false;

    this.handleMissingSourcemap();

    // TODO: see how to implement that
    if (this.isPerRouteLoggingEnabled()) {
      //this.disableDefaultLogging();
      this.uploadSourcemaps();
    }
    

    if(this.openNextOutput?.edgeFunctions?.middleware) {
      this.setMiddlewareEnv();
    }

    if (!disableIncrementalCache) {
      this.createRevalidationQueue();
      if (!disableTagCache) {
        this.createRevalidationTable();
      }
    }
  }

  public static override buildDefaultServerCachePolicyProps(): CachePolicyProps {
    return super.buildDefaultServerCachePolicyProps(
      DEFAULT_CACHE_POLICY_ALLOWED_HEADERS
    );
  }

  public get regionalServersCdk() {
    if (this.doNotDeploy) return;
    const regionalServers = this.serverFunctions.reduce((acc, server) => {
      return {
        ...acc, [
            server.id.replace("ServerFunction", "")
        ]: server.function 
      };
    }, {} as InterpolatedCdkOutputs<ONConfig>)
    return regionalServers
  }

  private createFunctionOrigin(fn: OpenNextFunctionOrigin, key: string, bucket: Bucket): FunctionOriginConfig {
    const { path: sitePath, environment, cdk } = this.props;
    const baseServerConfig = {
      description: "Next.js Server",
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    }
    //@ts-expect-error
    const functionCdkOverrides = (cdk?.servers?.[key] ?? {}) as InterpolatedCdkProp<{}>;
    return {
      type: "function" as const,
      constructId: `${key}ServerFunction`,
      function: {
        ...baseServerConfig,
        handler: fn.handler,
        bundle: path.join(sitePath, fn.bundle),
        runtime: "nodejs18.x" as const,
        architecture: Architecture.ARM_64,
        memorySize: 1536,
        environment: {
          ...environment,
          ...baseServerConfig.environment,
        },
        ...functionCdkOverrides,
      },
      streaming: fn.streaming,
      injections: [],
      warm: functionCdkOverrides.warm,
    }
  }

  private createEcsOrigin(ecs: OpenNextECSOrigin, key: string, bucket: Bucket) : FunctionOriginConfig {
    throw new Error('Ecs origin are not supported yet')
  }

  private createEdgeOrigin(fn: BaseFunction, key: string, bucket: Bucket): EdgeFunctionConfig {
    const { path: sitePath, cdk, environment } = this.props;
    const baseServerConfig = {
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    }
    //@ts-expect-error
    const fnCdkOverrides = (cdk?.servers?.[key] ?? {}) as InterpolatedCdkProp<{}>;
    return {
      constructId: `${key}EdgeFunction`,
      function: {
        handler: fn.handler,
        bundle: path.join(sitePath, fn.bundle),
        runtime: "nodejs18.x" as const,
        memorySize: 1024,
        environment: {
          ...environment,
          ...baseServerConfig.environment,
          ...fnCdkOverrides.environment
        },
        ...fnCdkOverrides,
      },
    }
  }

  protected plan(bucket: Bucket) {
    const {
      path: sitePath
    } = this.props;

    const openNextOutputPath = path.join(sitePath ?? ".", ".open-next", "open-next.output.json");
    if (!fs.existsSync(openNextOutputPath)) {
      throw new VisibleError(
        `Failed to load ".open-next/output.json" for the "${this.id}" site.`
      );
    }
    const openNextOutput = JSON.parse(
      fs.readFileSync(openNextOutputPath).toString()
    ) as OpenNextOutput;
    const imageOpt = openNextOutput.origins.imageOptimizer as OpenNextFunctionOrigin;
    const defaultFn = openNextOutput.origins.default;
    const remainingFns = Object.entries(openNextOutput.origins).filter(([key, value]) => {
      const result = key !== "imageOptimizer" && key !== "default" && key !== "s3";
      return result;
    }) as [string, OpenNextFunctionOrigin | OpenNextECSOrigin][];

    const remainingOrigins = remainingFns.reduce((acc, [key, value]) => {
      acc = {
        ...acc, [key]:
          value.type === "ecs" ? this.createEcsOrigin(value, key, bucket) : this.createFunctionOrigin(value, key, bucket)
      };
      return acc;
    }
      , {} as Record<string, FunctionOriginConfig>)

    const edgeFunctions = Object.entries(openNextOutput.edgeFunctions).reduce((acc, [key, value]) => {
      return { ...acc, [key]: this.createEdgeOrigin(value, key, bucket) };
    }, {} as Record<string, EdgeFunctionConfig>);


    return this.validatePlan({
      edge: false,
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [
            this.useCloudFrontFunctionHostHeaderInjection(),
            this.useCloudFrontFunctionCacheHeaderKey(),
          ],
        },
      },
      edgeFunctions,
      origins: {
        s3: openNextOutput.origins.s3,
        imageOptimizer: {
          type: "image-optimization-function",
          function: {
            description: "Next.js Image Optimization Function",
            handler: imageOpt.handler,
            code: Code.fromAsset(path.join(sitePath, imageOpt.bundle)),
            runtime: Runtime.NODEJS_18_X,
            architecture: Architecture.ARM_64,
            environment: {
              BUCKET_NAME: bucket.bucketName,
              BUCKET_KEY_PREFIX: "_assets",
            },
            permissions: [
              "s3"
            ],
            memorySize: 1536,
          }
        },
        default: defaultFn.type === "ecs" ? this.createEcsOrigin(defaultFn, "default", bucket) : this.createFunctionOrigin(defaultFn, "default", bucket),
        ...remainingOrigins,

      },
      //@ts-expect-error TODO: find a way to fix this typing issue
      behaviors: openNextOutput.behaviors.map((behavior) => {
        return {
          pattern: behavior.pattern === "*" ? undefined : behavior.pattern,
          origin: behavior.origin ?? "",
          cacheType: behavior.origin === "s3" ? "static" : "server" as const,
          cfFunction: "serverCfFunction",
          edgeFunction: behavior.edgeFunction ?? "",
        };
      }),
      cachePolicyAllowedHeaders: DEFAULT_CACHE_POLICY_ALLOWED_HEADERS,
      buildId: this.getBuildId(),
      warmerConfig: openNextOutput.additionalProps?.warmer ? {
        function: openNextOutput.additionalProps.warmer.bundle,
      } : undefined,
      additionalProps: {
        openNextOutput: openNextOutput,
      }
    });
  }

  private setMiddlewareEnv() {
    const origins = this.serverFunctions.reduce((acc, server) => {
      return {
        ...acc, 
        [server.function ?
          server.id.replace("ServerFunction", "") :
          server.id.replace("ServerContainer", "")
        ]: 
        {
          host:  Fn.parseDomainName(server.fnUrl?.url ?? ""),
          port: 443,
          protocol: "https",
        }
      }
    }, {} as Record<string, {host: string, port: number, protocol: string}>)
    console.log(origins)
    this.edgeFunctions?.middleware?.addEnvironment('OPEN_NEXT_ORIGIN', Fn.toJsonString(origins))
  }

  private createRevalidationQueue() {
    if (!this.serverFunction) return;

    const { cdk } = this.props;

    const queue = new Queue(this, "RevalidationQueue", {
      fifo: true,
      receiveMessageWaitTime: CdkDuration.seconds(20),
    });
    const consumer = new CdkFunction(this, "RevalidationFunction", {
      description: "Next.js revalidator",
      handler: "index.handler",
      code: Code.fromAsset(
        path.join(this.props.path, ".open-next", "revalidation-function")
      ),
      runtime: Runtime.NODEJS_18_X,
      timeout: CdkDuration.seconds(30),
      ...cdk?.revalidation,
    });
    consumer.addEventSource(new SqsEventSource(queue, { batchSize: 5 }));

    this.serverFunctions.forEach((server) => {
      // Allow server to send messages to the queue
      server.addEnvironment("REVALIDATION_QUEUE_URL", queue.queueUrl);
      server.addEnvironment("REVALIDATION_QUEUE_REGION", Stack.of(this).region);
      queue.grantSendMessages(server.role!);
    })
  }

  private createRevalidationTable() {
    if (!this.serverFunction) return;

    const { path: sitePath } = this.props;

    const table = new Table(this, "RevalidationTable", {
      partitionKey: { name: "tag", type: AttributeType.STRING },
      sortKey: { name: "path", type: AttributeType.STRING },
      pointInTimeRecovery: true,
      billing: Billing.onDemand(),
      globalSecondaryIndexes: [
        {
          indexName: "revalidate",
          partitionKey: { name: "path", type: AttributeType.STRING },
          sortKey: { name: "revalidatedAt", type: AttributeType.NUMBER },
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.serverFunctions.forEach((server) => {
      server?.addEnvironment("CACHE_DYNAMO_TABLE", table.tableName);
      table.grantReadWriteData(server.role!);
    })

    const dynamodbProviderPath = path.join(
      sitePath,
      ".open-next",
      "dynamodb-provider"
    );

    if (fs.existsSync(dynamodbProviderPath)) {
      // Provision 128MB of memory for every 4,000 prerendered routes,
      // 1GB per 40,000, up to 10GB. This tends to use ~70% of the memory
      // provisioned when testing.
      const prerenderedRouteCount = Object.keys(
        this.usePrerenderManifest()?.routes ?? {}
      ).length;

      const insertFn = new CdkFunction(this, "RevalidationInsertFunction", {
        description: "Next.js revalidation data insert",
        handler: "index.handler",
        code: Code.fromAsset(dynamodbProviderPath),
        runtime: Runtime.NODEJS_18_X,
        timeout: CdkDuration.minutes(15),
        memorySize: Math.min(
          10240,
          Math.max(128, Math.ceil(prerenderedRouteCount / 4000) * 128)
        ),
        initialPolicy: [
          new PolicyStatement({
            actions: [
              "dynamodb:BatchWriteItem",
              "dynamodb:PutItem",
              "dynamodb:DescribeTable",
            ],
            resources: [table.tableArn],
          }),
        ],
        environment: {
          CACHE_DYNAMO_TABLE: table.tableName,
        },
      });

      const provider = new Provider(this, "RevalidationProvider", {
        onEventHandler: insertFn,
        logRetention: RetentionDays.ONE_DAY,
      });

      new CustomResource(this, "RevalidationResource", {
        serviceToken: provider.serviceToken,
        properties: {
          version: Date.now().toString(),
        },
      });
    }
  }

  public getConstructMetadata() {
    const metadata = this.getConstructMetadataBase();
    return {
      ...metadata,
      type: "NextjsSite" as const,
      data: {
        ...metadata.data,
        routes: this.isPerRouteLoggingEnabled()
          ? {
            logGroupPrefix: `/sst/lambda/${(this.serverFunction as SsrFunction).functionName
              }`,
            data: this.useRoutes()?.map(({ route, logGroupPath }) => ({
              route,
              logGroupPath,
            })),
          }
          : undefined,
      },
    };
  }

  // Should be useless now since we copy only the necessary files
  private removeSourcemaps() {
    const { path: sitePath } = this.props;
    const files = globSync("**/*.js.map", {
      cwd: path.join(sitePath, ".open-next", "server-function"),
      nodir: true,
      dot: true,
    });
    for (const file of files) {
      fs.rmSync(path.join(sitePath, ".open-next", "server-function", file));
    }
  }

  private useRoutes() {
    if (this._routes) return this._routes;

    const routesManifest = this.useRoutesManifest();
    const appPathRoutesManifest = this.useAppPathRoutesManifest();

    const dynamicAndStaticRoutes = [
      ...routesManifest.dynamicRoutes,
      ...routesManifest.staticRoutes,
    ].map(({ page, regex }) => {
      const cwRoute = NextjsSite.buildCloudWatchRouteName(page);
      const cwHash = NextjsSite.buildCloudWatchRouteHash(page);
      const sourcemapPath =
        this.getSourcemapForAppRoute(page) ||
        this.getSourcemapForPagesRoute(page);
      return {
        route: page,
        regexMatch: regex,
        logGroupPath: `/${cwHash}${cwRoute}`,
        sourcemapPath: sourcemapPath,
        sourcemapKey: cwHash,
      };
    });

    // Some app routes are not in the routes manifest, so we need to add them
    // ie. app/api/route.ts => IS NOT in the routes manifest
    //     app/items/[slug]/route.ts => IS in the routes manifest (dynamicRoutes)
    const appRoutes = Object.values(appPathRoutesManifest)
      .filter(
        (page) =>
          routesManifest.dynamicRoutes.every((route) => route.page !== page) &&
          routesManifest.staticRoutes.every((route) => route.page !== page)
      )
      .map((page) => {
        const cwRoute = NextjsSite.buildCloudWatchRouteName(page);
        const cwHash = NextjsSite.buildCloudWatchRouteHash(page);
        const sourcemapPath = this.getSourcemapForAppRoute(page);
        return {
          route: page,
          prefixMatch: page,
          logGroupPath: `/${cwHash}${cwRoute}`,
          sourcemapPath: sourcemapPath,
          sourcemapKey: cwHash,
        };
      });

    const dataRoutes = (routesManifest.dataRoutes || []).map(
      ({ page, dataRouteRegex }) => {
        const routeDisplayName = page.endsWith("/")
          ? `/_next/data/BUILD_ID${page}index.json`
          : `/_next/data/BUILD_ID${page}.json`;
        const cwRoute = NextjsSite.buildCloudWatchRouteName(routeDisplayName);
        const cwHash = NextjsSite.buildCloudWatchRouteHash(page);
        return {
          route: routeDisplayName,
          regexMatch: dataRouteRegex,
          logGroupPath: `/${cwHash}${cwRoute}`,
        };
      }
    );

    this._routes = [
      ...[...dynamicAndStaticRoutes, ...appRoutes].sort((a, b) =>
        a.route.localeCompare(b.route)
      ),
      ...dataRoutes.sort((a, b) => a.route.localeCompare(b.route)),
    ];
    return this._routes;
  }

  private useRoutesManifest() {
    if (this.routesManifest) return this.routesManifest;

    const { path: sitePath } = this.props;
    const id = this.node.id;
    try {
      const content = fs
        .readFileSync(path.join(sitePath, ".next/routes-manifest.json"))
        .toString();
      this.routesManifest = JSON.parse(content);
      return this.routesManifest!;
    } catch (e) {
      console.error(e);
      throw new VisibleError(
        `Failed to read routes data from ".next/routes-manifest.json" for the "${id}" site.`
      );
    }
  }

  private useAppPathRoutesManifest() {
    // Example
    // {
    //   "/_not-found": "/_not-found",
    //   "/page": "/",
    //   "/favicon.ico/route": "/favicon.ico",
    //   "/api/route": "/api",                    <- app/api/route.js
    //   "/api/sub/route": "/api/sub",            <- app/api/sub/route.js
    //   "/items/[slug]/route": "/items/[slug]"   <- app/items/[slug]/route.js
    // }

    if (this.appPathRoutesManifest) return this.appPathRoutesManifest;

    const { path: sitePath } = this.props;
    try {
      const content = fs
        .readFileSync(
          path.join(sitePath, ".next/app-path-routes-manifest.json")
        )
        .toString();
      this.appPathRoutesManifest = JSON.parse(content);
      return this.appPathRoutesManifest!;
    } catch (e) {
      return {};
    }
  }

  private useAppPathsManifest() {
    if (this.appPathsManifest) return this.appPathsManifest;

    const { path: sitePath } = this.props;
    try {
      const content = fs
        .readFileSync(
          path.join(sitePath, ".next/server/app-paths-manifest.json")
        )
        .toString();
      this.appPathsManifest = JSON.parse(content);
      return this.appPathsManifest!;
    } catch (e) {
      return {};
    }
  }

  private usePagesManifest() {
    if (this.pagesManifest) return this.pagesManifest;

    const { path: sitePath } = this.props;
    try {
      const content = fs
        .readFileSync(path.join(sitePath, ".next/server/pages-manifest.json"))
        .toString();
      this.pagesManifest = JSON.parse(content);
      return this.pagesManifest!;
    } catch (e) {
      return {};
    }
  }

  private usePrerenderManifest() {
    if (this.prerenderManifest) return this.prerenderManifest;

    const { path: sitePath } = this.props;
    try {
      const content = fs
        .readFileSync(path.join(sitePath, ".next/prerender-manifest.json"))
        .toString();
      this.prerenderManifest = JSON.parse(content);
      return this.prerenderManifest!;
    } catch (e) {
      Logger.debug("Failed to load prerender-manifest.json", e);
    }
  }

  private useServerFunctionPerRouteLoggingInjection() {
    return `
if (event.rawPath) {
  const routeData = ${JSON.stringify(
    // @ts-expect-error
    this.useRoutes().map(({ regexMatch, prefixMatch, logGroupPath }) => ({
      regex: regexMatch,
      prefix: prefixMatch,
      logGroupPath,
    }))
  )}.find(({ regex, prefix }) => {
    if (regex) return event.rawPath.match(new RegExp(regex));
    if (prefix) return event.rawPath === prefix || (event.rawPath === prefix + "/");
    return false;
  });
  if (routeData) {
    console.log("::sst::" + JSON.stringify({
      action:"log.split",
      properties: {
        logGroupName:"/sst/lambda/" + context.functionName + routeData.logGroupPath,
      },
    }));
  }
}`;
  }

// This function is used to improve cache hit ratio by setting the cache key based on the request headers and the path
// next/image only need the accept header, and this header is not useful for the rest of the query
  private useCloudFrontFunctionCacheHeaderKey() {
    return `
function getHeader(key) {
  var header = request.headers[key];
  if(header) {
      if(header.multiValue){
          return header.multiValue.map((header) => header.value).join(",");
      }
      if(header.value){
          return header.value;
      }
  }
  return ""
  }
  var cacheKey = "";
  if(request.uri.startsWith("/_next/image")) {
    cacheKey = getHeader("accept");
  }else {
    cacheKey = getHeader("rsc") + getHeader("next-router-prefetch") + getHeader("next-router-state-tree") + getHeader("next-url") + getHeader("x-prerender-revalidate");
  }
  if(request.cookies["__prerender_bypass"]) {
    cacheKey += request.cookies["__prerender_bypass"] ? request.cookies["__prerender_bypass"].value : "";
  }
  var crypto = require('crypto');
  
  var hashedKey = crypto.createHash('md5').update(cacheKey).digest('hex');
  request.headers["x-open-next-cache-key"] = {value: hashedKey};
  `
  }

  private getBuildId() {
    const { path: sitePath } = this.props;
    return fs.readFileSync(path.join(sitePath, ".next/BUILD_ID")).toString();
  }

  private getSourcemapForAppRoute(page: string) {
    const { path: sitePath } = this.props;

    // Step 1: look up in "appPathRoutesManifest" to find the key with
    //         value equal to the page
    // {
    //   "/_not-found": "/_not-found",
    //   "/about/page": "/about",
    //   "/about/profile/page": "/about/profile",
    //   "/page": "/",
    //   "/favicon.ico/route": "/favicon.ico"
    // }
    const appPathRoutesManifest = this.useAppPathRoutesManifest();
    const appPathRoute = Object.keys(appPathRoutesManifest).find(
      (key) => appPathRoutesManifest[key] === page
    );
    if (!appPathRoute) return;

    // Step 2: look up in "appPathsManifest" to find the file with key equal
    //         to the page
    // {
    //   "/_not-found": "app/_not-found.js",
    //   "/about/page": "app/about/page.js",
    //   "/about/profile/page": "app/about/profile/page.js",
    //   "/page": "app/page.js",
    //   "/favicon.ico/route": "app/favicon.ico/route.js"
    // }
    const appPathsManifest = this.useAppPathsManifest();
    const filePath = appPathsManifest[appPathRoute];
    if (!filePath) return;

    // Step 3: check the .map file exists
    const sourcemapPath = path.join(
      sitePath,
      ".next",
      "server",
      `${filePath}.map`
    );
    if (!fs.existsSync(sourcemapPath)) return;

    return sourcemapPath;
  }

  private getSourcemapForPagesRoute(page: string) {
    const { path: sitePath } = this.props;

    // Step 1: look up in "pathsManifest" to find the file with key equal
    //         to the page
    // {
    //   "/_app": "pages/_app.js",
    //   "/_error": "pages/_error.js",
    //   "/404": "pages/404.html",
    //   "/api/hello": "pages/api/hello.js",
    //   "/api/auth/[...nextauth]": "pages/api/auth/[...nextauth].js",
    //   "/api/next-auth-restricted": "pages/api/next-auth-restricted.js",
    //   "/": "pages/index.js",
    //   "/ssr": "pages/ssr.js"
    // }
    const pagesManifest = this.usePagesManifest();
    const filePath = pagesManifest[page];
    if (!filePath) return;

    // Step 2: check the .map file exists
    const sourcemapPath = path.join(
      sitePath,
      ".next",
      "server",
      `${filePath}.map`
    );
    if (!fs.existsSync(sourcemapPath)) return;

    return sourcemapPath;
  }

  private isPerRouteLoggingEnabled() {
    return (
      !this.doNotDeploy &&
      !this.props.edge &&
      this.props.logging === "per-route"
    );
  }

  private handleMissingSourcemap() {
    if (this.doNotDeploy || this.props.edge) return;

    const hasMissingSourcemap = this.useRoutes().every(
      ({ sourcemapPath, sourcemapKey }) => !sourcemapPath || !sourcemapKey
    );
    if (!hasMissingSourcemap) return;

    (this.serverFunction as SsrFunction)._overrideMissingSourcemap();
  }

  private disableDefaultLogging() {
    const stack = Stack.of(this);
    const server = this.serverFunction as SsrFunction;

    const policy = new Policy(this, "DisableLoggingPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.DENY,
          actions: [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
          ],
          resources: [
            `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/${server.functionName}`,
            `arn:aws:logs:${stack.region}:${stack.account}:log-group:/aws/lambda/${server.functionName}:*`,
          ],
        }),
      ],
    });
    server.role?.attachInlinePolicy(policy);
  }

  private uploadSourcemaps() {
    const stack = Stack.of(this);
    const server = this.serverFunction as SsrFunction;

    this.useRoutes().forEach(({ sourcemapPath, sourcemapKey }) => {
      if (!sourcemapPath || !sourcemapKey) return;

      useDeferredTasks().add(async () => {
        // zip sourcemap
        const zipPath = `${sourcemapPath}.gz.zip`;
        const data = await fs.promises.readFile(sourcemapPath);
        await fs.promises.writeFile(zipPath, zlib.gzipSync(data));
        const asset = new Asset(this, `Sourcemap-${sourcemapKey}`, {
          path: zipPath,
        });

        useFunctions().sourcemaps.add(stack.stackName, {
          asset,
          tarKey: path.join(server.functionArn, sourcemapKey),
        });
      });
    });
  }

  private static buildCloudWatchRouteName(route: string) {
    return route.replace(/[^a-zA-Z0-9_\-/.#]/g, "");
  }

  private static buildCloudWatchRouteHash(route: string) {
    const hash = crypto.createHash("sha256");
    hash.update(route);
    return hash.digest("hex").substring(0, 8);
  }

  public static _test = {
    buildCloudWatchRouteName: NextjsSite.buildCloudWatchRouteName,
  };
}
