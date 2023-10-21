import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Construct } from "constructs";
import {
  Duration as CdkDuration,
  RemovalPolicy,
  CustomResource,
} from "aws-cdk-lib/core";
import {
  Code,
  Runtime,
  Function as CdkFunction,
  FunctionProps,
  Architecture,
  LayerVersion,
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
import { SsrSite, SsrSiteNormalizedProps, SsrSiteProps } from "./SsrSite.js";
import { Size, toCdkSize } from "./util/size.js";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { VisibleError } from "../error.js";
import { CachePolicyProps } from "aws-cdk-lib/aws-cloudfront";
import { SsrFunction, SsrFunctionProps } from "./SsrFunction.js";
import { EdgeFunctionProps } from "./EdgeFunction.js";

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
   * How the logs are stored in CloudWatch
   * - "combined" - Logs from all routes are stored in the same log group.
   * - "per-route" - Logs from each route are stored in a separate log group.
   * @default "combined"
   * @example
   * ```js
   * logging: "per-route",
   * ```
   */
  logging?: "combined" | "per-route";
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
  cdk?: SsrSiteProps["cdk"] & {
    revalidation?: Pick<FunctionProps, "vpc" | "vpcSubnets">;
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

const LAYER_VERSION = "2";
const DEFAULT_OPEN_NEXT_VERSION = "2.2.4";
const DEFAULT_CACHE_POLICY_ALLOWED_HEADERS = [
  "accept",
  "rsc",
  "next-router-prefetch",
  "next-router-state-tree",
  "next-url",
];

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
  private routes?: { route: string; regex: string; logGroupPath: string }[];

  constructor(scope: Construct, id: string, props?: NextjsSiteProps) {
    const streaming = props?.experimental?.streaming ?? false;
    const disableDynamoDBCache =
      props?.experimental?.disableDynamoDBCache ?? false;
    const disableIncrementalCache =
      props?.experimental?.disableIncrementalCache ?? false;

    super(scope, id, {
      buildCommand: [
        "npx",
        "--yes",
        `open-next@${props?.openNextVersion ?? DEFAULT_OPEN_NEXT_VERSION}`,
        "build",
        ...(streaming ? ["--streaming"] : []),
        ...(disableDynamoDBCache
          ? ["--dangerously-disable-dynamodb-cache"]
          : []),
        ...(disableIncrementalCache
          ? ["--dangerously-disable-incremental-cache"]
          : []),
      ].join(" "),
      ...props,
    });

    if (this.isPerRouteLoggingEnabled()) {
      this.disableDefaultLogging();
    }

    if (!disableIncrementalCache) {
      this.createRevalidationQueue();
      if (!disableDynamoDBCache) {
        this.createRevalidationTable();
      }
    }
  }

  public static override buildDefaultServerCachePolicyProps(): CachePolicyProps {
    return super.buildDefaultServerCachePolicyProps(
      DEFAULT_CACHE_POLICY_ALLOWED_HEADERS
    );
  }

  protected plan(bucket: Bucket) {
    const {
      path: sitePath,
      edge,
      experimental,
      imageOptimization,
    } = this.props;
    const serverConfig = this.wrapServerFunction({
      description: "Next.js server",
      bundle: path.join(sitePath, ".open-next", "server-function"),
      handler: "index.handler",
      environment: {
        CACHE_BUCKET_NAME: bucket.bucketName,
        CACHE_BUCKET_KEY_PREFIX: "_cache",
        CACHE_BUCKET_REGION: Stack.of(this).region,
      },
    });
    return this.validatePlan({
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: "CloudFrontFunction",
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
      },
      edgeFunctions: edge
        ? {
            edgeServer: {
              constructId: "ServerFunction",
              function: serverConfig,
            },
          }
        : undefined,
      origins: {
        ...(edge
          ? {}
          : {
              regionalServer: {
                type: "function",
                constructId: "ServerFunction",
                function: serverConfig,
                streaming: experimental?.streaming,
              },
            }),
        imageOptimizer: {
          type: "image-optimization-function",
          constructId: "ImageFunction",
          function: {
            description: "Next.js image optimizer",
            handler: "index.handler",
            code: Code.fromAsset(
              path.join(sitePath, ".open-next/image-optimization-function")
            ),
            runtime: Runtime.NODEJS_18_X,
            architecture: Architecture.ARM_64,
            environment: {
              BUCKET_NAME: bucket.bucketName,
              BUCKET_KEY_PREFIX: "_assets",
            },
            memorySize: imageOptimization?.memorySize
              ? typeof imageOptimization.memorySize === "string"
                ? toCdkSize(imageOptimization.memorySize).toMebibytes()
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

    const { cdk } = this.props;
    const server = this.serverFunction;

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

    // Allow server to send messages to the queue
    server.addEnvironment("REVALIDATION_QUEUE_URL", queue.queueUrl);
    server.addEnvironment("REVALIDATION_QUEUE_REGION", Stack.of(this).region);
    queue.grantSendMessages(server.role!);
  }

  private createRevalidationTable() {
    if (!this.serverFunction) return;

    const { path: sitePath } = this.props;
    const server = this.serverFunction;

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

    server?.addEnvironment("CACHE_DYNAMO_TABLE", table.tableName);
    table.grantReadWriteData(server.role!);

    const dynamodbProviderPath = path.join(
      sitePath,
      ".open-next",
      "dynamodb-provider"
    );

    if (fs.existsSync(dynamodbProviderPath)) {
      let revalidationInsertMemorySize = 128;
      try {
        const prerenderManifest: {version: number; routes: Record<string, unknown>} = JSON.parse(
          fs
            .readFileSync(path.join(sitePath, ".next", "prerender-manifest.json"))
            .toString()
        );

        const prerenderedRouteCount = Object.keys(prerenderManifest?.routes ?? {});

        // Provision 128MB of memory for every 2,000 prerendered routes, 1GB per 16,000, up to 10GB
        revalidationInsertMemorySize = Math.min(10240, Math.max(128, Math.ceil(prerenderedRouteCount.length / 2000) * 128));
      } catch (e) {
        console.warn("Failed to calculate the correct RevalidationInsertFunction memorySize using prerender-manifest.json, defaulting to 128MB", e);
      }

      const insertFn = new CdkFunction(this, "RevalidationInsertFunction", {
        description: "Next.js revalidation data insert",
        handler: "index.handler",
        code: Code.fromAsset(dynamodbProviderPath),
        runtime: Runtime.NODEJS_18_X,
        timeout: CdkDuration.minutes(15),
        memorySize: revalidationInsertMemorySize,
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
              logGroupPrefix: `/sst/lambda/${
                (this.serverFunction as SsrFunction).functionName
              }`,
              data: this.useRoutes().map(({ route, logGroupPath }) => ({
                route,
                logGroupPath,
              })),
            }
          : undefined,
      },
    };
  }

  private wrapServerFunction(config: SsrFunctionProps | EdgeFunctionProps) {
    const { path: sitePath, experimental, cdk } = this.props;
    const stack = Stack.of(this);
    const wrapperName = "nextjssite-index";
    const serverPath = path.join(sitePath, ".open-next", "server-function");

    const injections: string[] = [];
    if (this.isPerRouteLoggingEnabled()) {
      injections.push(`
      const routeData = ${JSON.stringify(
        this.useRoutes()
      )}.find(({ regex }) => event.rawPath.match(new RegExp(regex)));
      if (routeData) {
        console.log("::sst::" + JSON.stringify({
          action:"log.split",
          properties: {
            logGroupName:"/sst/lambda/" + context.functionName + routeData.logGroupPath,
          },
        }));
      }`);
    }

    fs.writeFileSync(
      path.join(serverPath, `${wrapperName}.mjs`),
      experimental?.streaming
        ? [
            `export const handler = awslambda.streamifyResponse(async (event, context) => {`,
            ...injections,
            `  const { handler: rawHandler} = await import("./index.mjs");`,
            `  return rawHandler(event, context);`,
            `});`,
          ].join("\n")
        : [
            `export const handler = async (event, context) => {`,
            ...injections,
            `  const { handler: rawHandler} = await import("./index.mjs");`,
            `  return rawHandler(event, context);`,
            `};`,
          ].join("\n")
    );

    return {
      ...config,
      layers: this.isPerRouteLoggingEnabled()
        ? [
            LayerVersion.fromLayerVersionArn(
              this,
              "SSTExtension",
              cdk?.server?.architecture?.name === Architecture.X86_64.name
                ? `arn:aws:lambda:${stack.region}:226609089145:layer:sst-extension-amd64:${LAYER_VERSION}`
                : `arn:aws:lambda:${stack.region}:226609089145:layer:sst-extension-arm64:${LAYER_VERSION}`
            ),
          ]
        : undefined,
      handler: `${wrapperName}.handler`,
    };
  }

  private useRoutes() {
    if (this.routes) return this.routes;

    const id = this.node.id;
    const { path: sitePath } = this.props;
    try {
      const content: {
        dynamicRoutes: { page: string; regex: string }[];
        staticRoutes: { page: string; regex: string }[];
        dataRoutes?: { page: string; dataRouteRegex: string }[];
      } = JSON.parse(
        fs
          .readFileSync(path.join(sitePath, ".next/routes-manifest.json"))
          .toString()
      );
      this.routes = [
        ...[...content.dynamicRoutes, ...content.staticRoutes]
          .map(({ page, regex }) => {
            const cwRoute = NextjsSite.buildCloudWatchRouteName(page);
            const cwHash = NextjsSite.buildCloudWatchRouteHash(page);
            return {
              route: page,
              regex,
              logGroupPath: `/${cwHash}${cwRoute}`,
            };
          })
          .sort((a, b) => a.route.localeCompare(b.route)),
        ...(content.dataRoutes || [])
          .map(({ page, dataRouteRegex }) => {
            const routeDisplayName = page.endsWith("/")
              ? `/_next/data/BUILD_ID${page}index.json`
              : `/_next/data/BUILD_ID${page}.json`;
            const cwRoute =
              NextjsSite.buildCloudWatchRouteName(routeDisplayName);
            const cwHash = NextjsSite.buildCloudWatchRouteHash(`data:${page}`);
            return {
              route: routeDisplayName,
              regex: dataRouteRegex,
              logGroupPath: `/${cwHash}${cwRoute}`,
            };
          })
          .sort((a, b) => a.route.localeCompare(b.route)),
      ];
      return this.routes;
    } catch (e) {
      console.error(e);
      throw new VisibleError(
        `Failed to read routes data from ".next/routes-manifest.json" for the "${id}" site.`
      );
    }
  }

  private getBuildId() {
    const { path: sitePath } = this.props;
    return fs.readFileSync(path.join(sitePath, ".next/BUILD_ID")).toString();
  }

  private isPerRouteLoggingEnabled() {
    return (
      !this.doNotDeploy &&
      !this.props.edge &&
      this.props.logging === "per-route"
    );
  }

  private disableDefaultLogging() {
    // Note: keep default logs enabled
    return;
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
