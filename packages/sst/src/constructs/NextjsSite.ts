import fs from "fs";
import path from "path";
import crypto from "crypto";
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
import {
  EdgeFunctionConfig,
  FunctionOriginConfig,
  SsrSite,
  SsrSiteNormalizedProps,
  SsrSiteProps,
} from "./SsrSite.js";
import { Size, toCdkSize } from "./util/size.js";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { VisibleError } from "../error.js";
import { CachePolicyProps } from "aws-cdk-lib/aws-cloudfront";
import { SsrFunction } from "./SsrFunction.js";
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
  middleware?: BaseFunction;
} & T;

interface OpenNextOutput<
  Origins extends BaseOrigins<
    Record<string, OpenNextOrigins>
  > = BaseOrigins<{}>,
  EdgeFunctions extends IEdgeFunctions<
    Record<string, BaseFunction>
  > = IEdgeFunctions<{}>
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

export interface NextjsSiteProps extends Omit<SsrSiteProps, "nodejs"> {
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
    /**
     * If set to true, already computed image will return 304 Not Modified.
     * This means that image needs to be immutable, the etag will be computed based on the image href, format and width and the next BUILD_ID.
     * @default false
     * @example
     * ```js
     * imageOptimization: {
     *  staticImageOptimization: true,
     * }
     */
    staticImageOptimization?: boolean;
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
  };
}

const DEFAULT_OPEN_NEXT_VERSION = "3.0.2";

type NextjsSiteNormalizedProps = NextjsSiteProps & SsrSiteNormalizedProps;

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
export class NextjsSite extends SsrSite {
  declare props: NextjsSiteNormalizedProps;
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

  constructor(scope: Construct, id: string, props: NextjsSiteProps = {}) {
    super(scope, id, {
      buildCommand: [
        "npx",
        "--yes",
        `open-next@${props?.openNextVersion ?? DEFAULT_OPEN_NEXT_VERSION}`,
        "build",
      ].join(" "),
      ...props,
    });

    const disableIncrementalCache =
      this.openNextOutput?.additionalProps?.disableIncrementalCache ?? false;
    const disableTagCache =
      this.openNextOutput?.additionalProps?.disableTagCache ?? false;

    this.handleMissingSourcemap();

    if (this.openNextOutput?.edgeFunctions?.middleware) {
      this.setMiddlewareEnv();
    }

    if (!disableIncrementalCache) {
      this.createRevalidationQueue();
      if (!disableTagCache) {
        this.createRevalidationTable();
      }
    }
  }

  private createFunctionOrigin(
    fn: OpenNextFunctionOrigin,
    key: string,
    bucket: Bucket
  ): FunctionOriginConfig {
    const { path: sitePath, environment, cdk } = this.props;
    const baseServerConfig = {
      description: "Next.js Server",
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    };
    return {
      type: "function" as const,
      constructId: `${key}ServerFunction`,
      function: {
        ...baseServerConfig,
        handler: fn.handler,
        bundle: path.join(sitePath, fn.bundle),
        runtime: this.props.runtime ?? ("nodejs18.x" as const),
        architecture: Architecture.ARM_64,
        memorySize: this.props.memorySize ?? 1536,
        environment: {
          ...environment,
          ...baseServerConfig.environment,
        },
      },
      streaming: fn.streaming,
      injections: [],
    };
  }

  private createEcsOrigin(
    ecs: OpenNextECSOrigin,
    key: string,
    bucket: Bucket
  ): FunctionOriginConfig {
    throw new Error("Ecs origin are not supported yet");
  }

  private createEdgeOrigin(
    fn: BaseFunction,
    key: string,
    bucket: Bucket
  ): EdgeFunctionConfig {
    const { path: sitePath, cdk, environment } = this.props;
    const baseServerConfig = {
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    };
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
        },
      },
    };
  }

  protected plan(bucket: Bucket) {
    const { path: sitePath } = this.props;
    const imageOptimization = this.props.imageOptimization;

    const openNextOutputPath = path.join(
      sitePath ?? ".",
      ".open-next",
      "open-next.output.json"
    );
    if (!fs.existsSync(openNextOutputPath)) {
      throw new VisibleError(
        `Failed to load ".open-next/output.json" for the "${this.id}" site.`
      );
    }
    const openNextOutput = JSON.parse(
      fs.readFileSync(openNextOutputPath).toString()
    ) as OpenNextOutput;
    this.openNextOutput = openNextOutput;

    const imageOpt = openNextOutput.origins
      .imageOptimizer as OpenNextFunctionOrigin;
    const defaultOrigin = openNextOutput.origins.default;
    const remainingOrigins = Object.entries(openNextOutput.origins).filter(
      ([key, value]) => {
        const result =
          key !== "imageOptimizer" && key !== "default" && key !== "s3";
        return result;
      }
    ) as [string, OpenNextFunctionOrigin | OpenNextECSOrigin][];

    const edgeFunctions = Object.entries(openNextOutput.edgeFunctions).reduce(
      (acc, [key, value]) => {
        return { ...acc, [key]: this.createEdgeOrigin(value, key, bucket) };
      },
      {} as Record<string, EdgeFunctionConfig>
    );

    return this.validatePlan({
      edge: false,
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [
            this.useCloudFrontFunctionHostHeaderInjection(),
            this.useCloudFrontFunctionCacheHeaderKey(),
            this.useCloudfrontGeoHeadersInjection(),
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
              ...(this.props.imageOptimization?.staticImageOptimization
                ? { OPENNEXT_STATIC_ETAG: "true" }
                : {}),
            },
            permissions: ["s3"],
            memorySize: imageOptimization?.memorySize
              ? typeof imageOptimization.memorySize === "string"
                ? toCdkSize(imageOptimization.memorySize).toMebibytes()
                : imageOptimization.memorySize
              : 1536,
          },
        },
        default:
          defaultOrigin.type === "ecs"
            ? this.createEcsOrigin(defaultOrigin, "default", bucket)
            : this.createFunctionOrigin(defaultOrigin, "default", bucket),
        ...Object.fromEntries(
          remainingOrigins.map(([key, value]) => [
            key,
            value.type === "ecs"
              ? this.createEcsOrigin(value, key, bucket)
              : this.createFunctionOrigin(value, key, bucket),
          ])
        ),
      },
      behaviors: openNextOutput.behaviors.map((behavior) => {
        return {
          pattern: behavior.pattern === "*" ? undefined : behavior.pattern,
          origin: behavior.origin!,
          cacheType: behavior.origin === "s3" ? "static" : "server",
          cfFunction: "serverCfFunction",
          edgeFunction: behavior.edgeFunction ?? "",
        };
      }),
      buildId: this.getBuildId(),
      warmer: openNextOutput.additionalProps?.warmer
        ? {
            function: path.join(
              sitePath,
              openNextOutput.additionalProps.warmer.bundle
            ),
          }
        : undefined,
      serverCachePolicy: {
        allowedHeaders: ["x-open-next-cache-key"],
      },
    });
  }

  private setMiddlewareEnv() {
    const origins = this.serverFunctions.reduce((acc, server) => {
      return {
        ...acc,
        [server.function
          ? server.id.replace("ServerFunction", "")
          : server.id.replace("ServerContainer", "")]: {
          host: Fn.parseDomainName(server.url ?? ""),
          port: 443,
          protocol: "https",
        },
      };
    }, {} as Record<string, { host: string; port: number; protocol: string }>);
    this.edgeFunctions?.middleware?.addEnvironment(
      "OPEN_NEXT_ORIGIN",
      Fn.toJsonString(origins)
    );
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
    });
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
    });

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
    return {
      type: "NextjsSite" as const,
      ...this.getConstructMetadataBase(),
    };
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
  `;
  }

  // Inject the CloudFront viewer country, region, latitude, and longitude headers into the request headers
  // for OpenNext to use them
  private useCloudfrontGeoHeadersInjection() {
    return `
if(request.headers["cloudfront-viewer-city"]) {
  request.headers["x-open-next-city"] = request.headers["cloudfront-viewer-city"];
}
if(request.headers["cloudfront-viewer-country"]) {
  request.headers["x-open-next-country"] = request.headers["cloudfront-viewer-country"];
}
if(request.headers["cloudfront-viewer-region"]) {
  request.headers["x-open-next-region"] = request.headers["cloudfront-viewer-region"];
}
if(request.headers["cloudfront-viewer-latitude"]) {
  request.headers["x-open-next-latitude"] = request.headers["cloudfront-viewer-latitude"];
}
if(request.headers["cloudfront-viewer-longitude"]) {
  request.headers["x-open-next-longitude"] = request.headers["cloudfront-viewer-longitude"];
}
    `;
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

  private handleMissingSourcemap() {
    if (this.doNotDeploy || this.props.edge) return;

    const hasMissingSourcemap = this.useRoutes().every(
      ({ sourcemapPath, sourcemapKey }) => !sourcemapPath || !sourcemapKey
    );
    if (!hasMissingSourcemap) return;

    (this.serverFunction as SsrFunction)._overrideMissingSourcemap();
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
