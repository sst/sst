import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import { globSync } from "glob";
import pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Size, toMBs } from "./util/size.js";
import { Function } from "./function.js";
import { SsrSite, SsrSiteArgs } from "./ssr-site.js";

const LAYER_VERSION = "2";
const DEFAULT_OPEN_NEXT_VERSION = "2.3.1";
const DEFAULT_CACHE_POLICY_ALLOWED_HEADERS = [
  "accept",
  "rsc",
  "next-router-prefetch",
  "next-router-state-tree",
  "next-url",
];

export interface NextjsArgs extends SsrSiteArgs {
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
  experimental?: {
    /**
     * Enable streaming. Currently an experimental feature in OpenNext.
     * @default false
     * @example
     * ```js
     * experimental: {
     *   streaming: true,
     * }
     * ```
     */
    streaming?: boolean;
    /**
     * Disabling incremental cache will cause the entire page to be revalidated on each request. This can result in ISR and SSG pages to be in an inconsistent state. Specify this option if you are using SSR pages only.
     *
     * Note that it is possible to disable incremental cache while leaving on-demand revalidation enabled.
     * @default false
     * @example
     * ```js
     * experimental: {
     *   disableIncrementalCache: true,
     * }
     * ```
     */
    disableIncrementalCache?: boolean;
    /**
     * Disabling DynamoDB cache will cause on-demand revalidation by path (`revalidatePath`) and by cache tag (`revalidateTag`) to fail silently.
     * @default false
     * @example
     * ```js
     * experimental: {
     *   disableDynamoDBCache: true,
     * }
     * ```
     */
    disableDynamoDBCache?: boolean;
  };
}

/**
 * The `Nextjs` construct is a higher level CDK construct that makes it easy to create a Next.js app.
 * @example
 * Deploys a Next.js app in the `my-next-app` directory.
 *
 * ```js
 * new Nextjs(stack, "web", {
 *   path: "my-next-app/",
 * });
 * ```
 */
export class Nextjs extends SsrSite {
  declare args: ReturnType<Nextjs["normalizeArgs"]>;
  private _routes?: {
    route: string;
    regex: string;
    logGroupPath: string;
    sourcemapPath?: string;
    sourcemapKey?: string;
  }[];
  private routesManifest?: {
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

  // TODO - SST design: the child class need to inject code in between
  //                    parent's constructor
  // TODO - SST design: how to type this.args
  normalizeArgs(rawArgs: NextjsArgs) {
    return super.normalizeArgs(rawArgs);
  }

  constructor(name: string, rawArgs?: NextjsArgs) {
    const props = {
      logging: rawArgs?.logging ?? "per-route",
      experimental: {
        streaming: rawArgs?.experimental?.streaming ?? false,
        disableDynamoDBCache:
          rawArgs?.experimental?.disableDynamoDBCache ?? false,
        disableIncrementalCache:
          rawArgs?.experimental?.disableIncrementalCache ?? false,
        ...rawArgs?.experimental,
      },
      ...rawArgs,
    };

    super(name, {
      buildCommand: [
        "npx",
        "--yes",
        `open-next@${props?.openNextVersion ?? DEFAULT_OPEN_NEXT_VERSION}`,
        "build",
        ...(props.experimental.streaming ? ["--streaming"] : []),
        ...(props.experimental.disableDynamoDBCache
          ? ["--dangerously-disable-dynamodb-cache"]
          : []),
        ...(props.experimental.disableIncrementalCache
          ? ["--dangerously-disable-incremental-cache"]
          : []),
      ].join(" "),
      ...props,
    });

    this.handleMissingSourcemap();

    if (this.isPerRouteLoggingEnabled()) {
      this.disableDefaultLogging();
      this.uploadSourcemaps();
    }

    if (!props.experimental.disableIncrementalCache) {
      this.createRevalidationQueue();
      if (!props.experimental.disableDynamoDBCache) {
        this.createRevalidationTable();
      }
    }
  }

  protected plan(bucket: aws.s3.Bucket) {
    const { path: sitePath, edge, experimental, imageOptimization } = this.args;
    const serverConfig = {
      description: "Next.js server",
      bundle: path.join(sitePath, ".open-next", "server-function"),
      handler: "index.handler",
      environment: {
        CACHE_BUCKET_NAME: bucket.bucket,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: app.region,
      },
      layers: this.isPerRouteLoggingEnabled()
        ? [
            aws.lambda.LayerVersion.get(
              "sst-extension",
              `arn:aws:lambda:${app.region}:226609089145:layer:sst-extension-arm64:${LAYER_VERSION}`
              //              cdk?.server?.architecture?.name === Architecture.X86_64.name
              //                ? `arn:aws:lambda:${stack.region}:226609089145:layer:sst-extension-amd64:${LAYER_VERSION}`
              //                : `arn:aws:lambda:${stack.region}:226609089145:layer:sst-extension-arm64:${LAYER_VERSION}`
            ),
          ]
        : undefined,
    };
    this.removeSourcemaps();
    return this.validatePlan({
      edge: edge ?? false,
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
      },
      edgeFunctions: edge
        ? { edgeServer: { function: serverConfig } }
        : undefined,
      origins: {
        ...(edge
          ? {}
          : {
              regionalServer: {
                type: "function",
                function: serverConfig,
                streaming: experimental?.streaming,
                injections: this.isPerRouteLoggingEnabled()
                  ? [this.useServerFunctionPerRouteLoggingInjection()]
                  : [],
              },
            }),
        imageOptimizer: {
          type: "image-optimization-function",
          function: {
            description: "Next.js image optimizer",
            handler: "index.handler",
            bundle: path.join(
              sitePath,
              ".open-next",
              "image-optimization-function"
            ),
            runtime: "nodejs18.x",
            architectures: ["arm64"],
            environment: {
              BUCKET_NAME: bucket.bucket,
              BUCKET_KEY_PREFIX: "_assets",
            },
            memorySize: imageOptimization?.memorySize
              ? typeof imageOptimization.memorySize === "string"
                ? toMBs(imageOptimization.memorySize)
                : imageOptimization.memorySize
              : 1536,
          },
        },
        s3: {
          type: "s3",
          originPath: "_assets",
          copy: [
            {
              from: ".open-next/assets",
              to: "_assets",
              cached: true,
              versionedSubDir: "_next",
            },
            { from: ".open-next/cache", to: "_cache", cached: false },
          ],
        },
      },
      behaviors: [
        ...(edge
          ? [
              {
                cacheType: "server",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "s3",
              } as const,
              {
                cacheType: "server",
                pattern: "api/*",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "s3",
              } as const,
              {
                cacheType: "server",
                pattern: "_next/data/*",
                cfFunction: "serverCfFunction",
                edgeFunction: "edgeServer",
                origin: "s3",
              } as const,
            ]
          : [
              {
                cacheType: "server",
                cfFunction: "serverCfFunction",
                origin: "regionalServer",
              } as const,
              {
                cacheType: "server",
                pattern: "api/*",
                cfFunction: "serverCfFunction",
                origin: "regionalServer",
              } as const,
              {
                cacheType: "server",
                pattern: "_next/data/*",
                cfFunction: "serverCfFunction",
                origin: "regionalServer",
              } as const,
            ]),
        {
          cacheType: "server",
          pattern: "_next/image*",
          cfFunction: "serverCfFunction",
          origin: "imageOptimizer",
        },
        // create 1 behaviour for each top level asset file/folder
        ...fs.readdirSync(path.join(sitePath, ".open-next/assets")).map(
          (item) =>
            ({
              cacheType: "static",
              pattern: fs
                .statSync(path.join(sitePath, ".open-next/assets", item))
                .isDirectory()
                ? `${item}/*`
                : item,
              origin: "s3",
            } as const)
        ),
      ],
      cachePolicyAllowedHeaders: DEFAULT_CACHE_POLICY_ALLOWED_HEADERS,
      buildId: this.getBuildId(),
      warmerConfig: {
        function: path.join(sitePath, ".open-next", "warmer-function"),
      },
    });
  }

  private createRevalidationQueue() {
    if (!this.serverFunction) return;

    const server = this.serverFunction;

    const queue = new aws.sqs.Queue("revalidation-queue", {
      fifoQueue: true,
      receiveWaitTimeSeconds: 20,
    });
    const consumer = new Function("revalidation-consumer", {
      description: "Next.js revalidator",
      handler: "index.handler",
      bundle: path.join(this.args.path, ".open-next", "revalidation-function"),
      runtime: "nodejs18.x",
      timeout: 30,
    });
    new aws.lambda.EventSourceMapping(`revalidation-consumer-event-source`, {
      functionName: consumer.aws.function.name,
      eventSourceArn: queue.arn,
      batchSize: 5,
    });

    // Allow server to send messages to the queue
    server.addEnvironment("REVALIDATION_QUEUE_URL", queue.queueUrl);
    server.addEnvironment("REVALIDATION_QUEUE_REGION", Stack.of(this).region);
    queue.grantSendMessages(server.role!);
  }

  private createRevalidationTable() {
    if (!this.serverFunction) return;

    const { path: sitePath } = this.args;
    const server = this.serverFunction;

    const table = new aws.dynamodb.Table("revalidation-table", {
      attributes: [
        { name: "tag", type: "S" },
        { name: "path", type: "S" },
        { name: "revalidatedAt", type: "N" },
      ],
      hashKey: "tag",
      rangeKey: "path",
      pointInTimeRecovery: {
        enabled: true,
      },
      billingMode: "PAY_PER_REQUEST",
      globalSecondaryIndexes: [
        {
          name: "revalidate",
          hashKey: "path",
          rangeKey: "revalidatedAt",
          projectionType: "ALL",
        },
      ],
    });

    server?.addEnvironment("CACHE_DYNAMO_TABLE", table.tableName);
    table.grantReadWriteData(server.role!);

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

      const insertFn = new Function("revalidation-table-seed", {
        description: "Next.js revalidation data insert",
        handler: "index.handler",
        bundle: dynamodbProviderPath,
        runtime: "nodejs18.x",
        timeout: 900,
        memorySize: Math.min(
          10240,
          Math.max(128, Math.ceil(prerenderedRouteCount / 4000) * 128)
        ),
        policies: [
          {
            name: "dynamodb",
            policy: table.arn.apply((arn) =>
              aws.iam
                .getPolicyDocument({
                  statements: [
                    {
                      actions: [
                        "dynamodb:BatchWriteItem",
                        "dynamodb:PutItem",
                        "dynamodb:DescribeTable",
                      ],
                      resources: [arn],
                    },
                  ],
                })
                .then((doc) => doc.json)
            ),
          },
        ],
        environment: {
          CACHE_DYNAMO_TABLE: table.name,
        },
      });

      new aws.lambda.Invocation("revalidation-table-seed-invocation", {
        functionName: insertFn.aws.function.name,
        triggers: {
          version: Date.now().toString(),
        },
        input: JSON.stringify({}),
      });
    }
  }

  //public getConstructMetadata() {
  //  const metadata = this.getConstructMetadataBase();
  //  return {
  //    ...metadata,
  //    type: "NextjsSite" as const,
  //    data: {
  //      ...metadata.data,
  //      routes: this.isPerRouteLoggingEnabled()
  //        ? {
  //            logGroupPrefix: `/sst/lambda/${
  //              (this.serverFunction as SsrFunction).functionName
  //            }`,
  //            data: this.useRoutes().map(({ route, logGroupPath }) => ({
  //              route,
  //              logGroupPath,
  //            })),
  //          }
  //        : undefined,
  //    },
  //  };
  //}

  private removeSourcemaps() {
    const { path: sitePath } = this.args;
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

    this._routes = [
      ...[...routesManifest.dynamicRoutes, ...routesManifest.staticRoutes]
        .map(({ page, regex }) => {
          const cwRoute = Nextjs.buildCloudWatchRouteName(page);
          const cwHash = Nextjs.buildCloudWatchRouteHash(page);
          const sourcemapPath =
            this.getSourcemapForAppRoute(page) ||
            this.getSourcemapForPagesRoute(page);
          return {
            route: page,
            regex,
            logGroupPath: `/${cwHash}${cwRoute}`,
            sourcemapPath: sourcemapPath,
            sourcemapKey: cwHash,
          };
        })
        .sort((a, b) => a.route.localeCompare(b.route)),
      ...(routesManifest.dataRoutes || [])
        .map(({ page, dataRouteRegex }) => {
          const routeDisplayName = page.endsWith("/")
            ? `/_next/data/BUILD_ID${page}index.json`
            : `/_next/data/BUILD_ID${page}.json`;
          const cwRoute = Nextjs.buildCloudWatchRouteName(routeDisplayName);
          const cwHash = Nextjs.buildCloudWatchRouteHash(page);
          return {
            route: routeDisplayName,
            regex: dataRouteRegex,
            logGroupPath: `/${cwHash}${cwRoute}`,
          };
        })
        .sort((a, b) => a.route.localeCompare(b.route)),
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

    const { path: sitePath } = this.args;
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

    const { path: sitePath } = this.args;
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
    this.useRoutes().map(({ regex, logGroupPath }) => ({
      regex,
      logGroupPath,
    }))
  )}.find(({ regex }) => event.rawPath.match(new RegExp(regex)));
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

  private getBuildId() {
    const { path: sitePath } = this.args;
    return fs.readFileSync(path.join(sitePath, ".next/BUILD_ID")).toString();
  }

  private getSourcemapForAppRoute(page: string) {
    const { path: sitePath } = this.args;

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
      !this.doNotDeploy && !this.args.edge && this.args.logging === "per-route"
    );
  }

  private handleMissingSourcemap() {
    if (this.doNotDeploy || this.args.edge) return;

    const hasMissingSourcemap = this.useRoutes().every(
      ({ sourcemapPath, sourcemapKey }) => !sourcemapPath || !sourcemapKey
    );
    if (!hasMissingSourcemap) return;

    // TODO set correct missing sourcemap value
    //(this.serverFunction as SsrFunction)._overrideMissingSourcemap();
  }

  private disableDefaultLogging() {
    if (!this.serverFunction) return;

    // TODO create log group and reference log group arn
    const policy = new aws.iam.Policy(`disable-logging-policy`, {
      policy: pulumi.interpolate`{
            "Version": "2012-10-17",
            "Statement": [
              {
                "Actions": [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                ],
                "Effect": "Deny",
                "Resources": [
                  "arn:aws:logs:${app.aws.region}:${app.account}:log-group:/aws/lambda/${this.serverFunction?.aws.function.name}",
                  "arn:aws:logs:${app.aws.region}:${app.account}:log-group:/aws/lambda/${this.serverFunction?.aws.function.name}:*",
                ],
              }
            ]
          }`,
    });
    new aws.iam.RolePolicyAttachment(`disable-logging-policy-attachment`, {
      policyArn: policy.arn,
      role: this.serverFunction.aws.function.role,
    });
  }

  private uploadSourcemaps() {
    if (!this.serverFunction) return;

    this.useRoutes().forEach(({ sourcemapPath, sourcemapKey }) => {
      if (!sourcemapPath || !sourcemapKey) return;

      new aws.s3.BucketObject(sourcemapKey, {
        bucket: app.bootstrap.bucket,
        source: new pulumi.asset.FileAsset(sourcemapPath),
        key: this.serverFunction!.aws.function.arn.apply((arn) =>
          path.join(arn, sourcemapKey)
        ),
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
    buildCloudWatchRouteName: Nextjs.buildCloudWatchRouteName,
  };
}
