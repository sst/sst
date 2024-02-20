import fs from "fs";
import path from "path";
import crypto from "crypto";
import { globSync } from "glob";
import {
  ComponentResourceOptions,
  Output,
  all,
  asset,
  interpolate,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Size } from "../size.js";
import { Function } from "./function.js";
import {
  SsrSiteArgs,
  buildApp,
  createBucket,
  createServersAndDistribution,
  prepare,
  useCloudFrontFunctionHostHeaderInjection,
  validatePlan,
} from "./ssr-site.js";
import { Cdn } from "./cdn.js";
import { bootstrap } from "./helpers/bootstrap.js";
import { Bucket } from "./bucket.js";
import { Component, transform } from "../component.js";
import { sanitizeToPascalCase } from "../naming.js";
import { Hint } from "../hint.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import type { Input } from "../input.js";
import { Cache } from "./providers/cache.js";

const LAYER_VERSION = "2";
const DEFAULT_OPEN_NEXT_VERSION = "3.0.0-rc.5";
const DEFAULT_CACHE_POLICY_ALLOWED_HEADERS = [
  "accept",
  "x-prerender-revalidate",
  "rsc",
  "next-router-prefetch",
  "next-router-state-tree",
  "next-url",
];

type BaseFunction = {
  handler: string;
  bundle: string;
};

type OpenNextFunctionOrigin = {
  type: "function";
  streaming?: boolean;
  wrapper: string;
  converter: string;
} & BaseFunction;

type OpenNextServerFunctionOrigin = OpenNextFunctionOrigin & {
  queue: string;
  incrementalCache: string;
  tagCache: string;
};

type OpenNextImageOptimizationOrigin = OpenNextFunctionOrigin & {
  imageLoader: string;
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

interface OpenNextOutput {
  edgeFunctions: {
    [key: string]: BaseFunction;
  } & {
    middleware?: BaseFunction & { pathResolver: string };
  };
  origins: {
    s3: OpenNextS3Origin;
    default: OpenNextServerFunctionOrigin;
    imageOptimizer: OpenNextImageOptimizationOrigin;
  } & {
    [key: string]: OpenNextServerFunctionOrigin | OpenNextS3Origin;
  };
  behaviors: {
    pattern: string;
    origin?: string;
    edgeFunction?: string;
  }[];
  additionalProps?: {
    disableIncrementalCache?: boolean;
    disableTagCache?: boolean;
    initializationFunction?: BaseFunction;
    warmer?: BaseFunction;
    revalidationFunction?: BaseFunction;
  };
}

export interface NextjsArgs extends SsrSiteArgs {
  /**
   * OpenNext version for building the Next.js site.
   * @default Latest OpenNext version
   * @example
   * ```js
   * openNextVersion: "3.0.0-rc.3",
   * ```
   */
  openNextVersion?: Input<string>;
  /**
   * How the logs are stored in CloudWatch
   * - "combined" - Logs from all routes are stored in the same log group.
   * - "per-route" - Logs from each route are stored in a separate log group. Doesn't work right now
   * @default "per-route"
   * @example
   * ```js
   * logging: "combined",
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
     *   memory: "512 MB",
     * }
     * ```
     */
    memory?: Size;
  };
}

/**
 * The `Nextjs` component lets you deploy Next.js apps on AWS. It uses
 * [OpenNext](https://open-next.js.org) to build your Next.js app, and transforms the build
 * output to a format that can be deployed to AWS.
 *
 * @example
 * Deploys a Next.js app in the `my-next-app` directory.
 *
 * ```js
 * new Nextjs("Web", {
 *   path: "my-next-app/",
 * });
 * ```
 */
export class Nextjs extends Component implements Link.Linkable {
  private cdn: Cdn;
  private assets: Bucket;
  private server: Function;

  constructor(
    name: string,
    args?: NextjsArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:aws:Nextjs", name, args, opts);

    let _routes: Output<
      ({
        route: string;
        logGroupPath: string;
        sourcemapPath?: string;
        sourcemapKey?: string;
      } & ({ regexMatch: string } | { prefixMatch: string }))[]
    >;

    args = args ?? {};
    opts = opts ?? {};
    const parent = this;
    const logging = normalizeLogging();
    const buildCommand = normalizeBuildCommand();
    const { sitePath, region } = prepare(args, opts);
    const { access, bucket } = createBucket(parent, name);
    const outputPath = buildApp(name, args, sitePath, buildCommand);
    const {
      openNextOutput,
      buildId,
      routesManifest,
      appPathRoutesManifest,
      appPathsManifest,
      pagesManifest,
      prerenderManifest,
    } = loadBuildOutput();
    const revalidationQueue = createRevalidationQueue();
    const revalidationTable = createRevalidationTable();
    createRevalidationTableSeeder();
    const plan = buildPlan();
    removeSourcemaps();
    const { distribution, ssrFunctions, edgeFunctions } =
      createServersAndDistribution(
        parent,
        name,
        args,
        outputPath,
        access,
        bucket,
        plan,
      );
    const serverFunction = ssrFunctions[0] ?? Object.values(edgeFunctions)[0];
    handleMissingSourcemap();

    // Handle per-route logging
    disableDefaultLogging();
    uploadSourcemaps();

    this.assets = bucket;
    this.cdn = distribution as unknown as Cdn;
    this.server = serverFunction as unknown as Function;
    Hint.register(
      this.urn,
      all([this.cdn.domainUrl, this.cdn.url]).apply(
        ([domainUrl, url]) => domainUrl ?? url,
      ),
    );
    this.registerOutputs({
      _metadata: {
        mode: $dev ? "placeholder" : "deployed",
        path: sitePath,
        customDomainUrl: this.cdn.domainUrl,
        edge: plan.edge,
      },
    });

    function normalizeLogging() {
      return output(args?.logging).apply((logging) => logging ?? "per-route");
    }

    function normalizeBuildCommand() {
      return all([args?.buildCommand, args?.openNextVersion]).apply(
        ([buildCommand, openNextVersion]) =>
          buildCommand ??
          [
            "npx",
            "--yes",
            `open-next@${openNextVersion ?? DEFAULT_OPEN_NEXT_VERSION}`,
            "build",
          ].join(" "),
      );
    }

    function loadBuildOutput() {
      const cache = new Cache(
        `${name}OpenNextOutput`,
        {
          data: $dev ? loadOpenNextOutputPlaceholder() : loadOpenNextOutput(),
        },
        {
          parent,
          ignoreChanges: $dev ? ["*"] : undefined,
        },
      );

      return {
        openNextOutput: cache.data as ReturnType<typeof loadOpenNextOutput>,
        buildId: loadBuildId(),
        routesManifest: loadRoutesManifest(),
        appPathRoutesManifest: loadAppPathRoutesManifest(),
        appPathsManifest: loadAppPathsManifest(),
        pagesManifest: loadPagesManifest(),
        prerenderManifest: loadPrerenderManifest(),
      };
    }

    function loadOpenNextOutput() {
      return outputPath.apply((outputPath) => {
        const openNextOutputPath = path.join(
          outputPath,
          ".open-next",
          "open-next.output.json",
        );
        if (!fs.existsSync(openNextOutputPath)) {
          throw new VisibleError(
            `Failed to load open-next.output.json from "${openNextOutputPath}".`,
          );
        }
        const content = fs.readFileSync(openNextOutputPath).toString();
        const json = JSON.parse(content) as OpenNextOutput;
        // Currently open-next.output.json's initializationFunction value
        // is wrong, it is set to ".open-next/initialization-function"
        if (json.additionalProps?.initializationFunction) {
          json.additionalProps.initializationFunction = {
            handler: "index.handler",
            bundle: ".open-next/dynamodb-provider",
          };
        }
        return json;
      });
    }

    function loadOpenNextOutputPlaceholder() {
      // Configure origins and behaviors based on the Next.js app from quick start
      return outputPath.apply((outputPath) => ({
        edgeFunctions: {},
        origins: {
          s3: {
            type: "s3",
            originPath: "_assets",
            // do not upload anything
            copy: [],
          },
          imageOptimizer: {
            type: "function",
            // use placeholder code
            handler: "index.handler",
            bundle: path.relative(
              outputPath,
              path.join($cli.paths.platform, "functions", "empty-function"),
            ),
            streaming: false,
          },
          default: {
            type: "function",
            handler: "index.handler",
            // use placeholder code
            bundle: path.relative(
              outputPath,
              path.join(
                $cli.paths.platform,
                "functions",
                "ssr-function-placeholder",
              ),
            ),
            streaming: false,
          },
        },
        behaviors: [
          { pattern: "_next/image*", origin: "imageOptimizer" },
          { pattern: "_next/data/*", origin: "default" },
          { pattern: "*", origin: "default" },
          { pattern: "BUILD_ID", origin: "s3" },
          { pattern: "_next/*", origin: "s3" },
          { pattern: "favicon.ico", origin: "s3" },
          { pattern: "next.svg", origin: "s3" },
          { pattern: "vercel.svg", origin: "s3" },
        ],
        additionalProps: {
          // skip creating revalidation queue
          disableIncrementalCache: true,
          // skip creating revalidation table
          disableTagCache: true,
        },
      }));
    }

    function loadBuildId() {
      return outputPath.apply((outputPath) => {
        if ($dev) return "mock-build-id";

        try {
          return fs
            .readFileSync(path.join(outputPath, ".next/BUILD_ID"))
            .toString();
        } catch (e) {
          console.error(e);
          throw new VisibleError(
            `Failed to read build id from ".next/BUILD_ID" for the "${name}" site.`,
          );
        }
      });
    }

    function loadRoutesManifest() {
      return outputPath.apply((outputPath) => {
        if ($dev) return { dynamicRoutes: [], staticRoutes: [] };

        try {
          const content = fs
            .readFileSync(path.join(outputPath, ".next/routes-manifest.json"))
            .toString();
          return JSON.parse(content) as {
            dynamicRoutes: { page: string; regex: string }[];
            staticRoutes: { page: string; regex: string }[];
            dataRoutes?: { page: string; dataRouteRegex: string }[];
          };
        } catch (e) {
          console.error(e);
          throw new VisibleError(
            `Failed to read routes data from ".next/routes-manifest.json" for the "${name}" site.`,
          );
        }
      });
    }

    function loadAppPathRoutesManifest() {
      // Example
      // {
      //   "/_not-found": "/_not-found",
      //   "/page": "/",
      //   "/favicon.ico/route": "/favicon.ico",
      //   "/api/route": "/api",                    <- app/api/route.js
      //   "/api/sub/route": "/api/sub",            <- app/api/sub/route.js
      //   "/items/[slug]/route": "/items/[slug]"   <- app/items/[slug]/route.js
      // }

      return outputPath.apply((outputPath) => {
        if ($dev) return {};

        try {
          const content = fs
            .readFileSync(
              path.join(outputPath, ".next/app-path-routes-manifest.json"),
            )
            .toString();
          return JSON.parse(content) as Record<string, string>;
        } catch (e) {
          return {};
        }
      });
    }

    function loadAppPathsManifest() {
      return outputPath.apply((outputPath) => {
        if ($dev) return {};

        try {
          const content = fs
            .readFileSync(
              path.join(outputPath, ".next/server/app-paths-manifest.json"),
            )
            .toString();
          return JSON.parse(content) as Record<string, string>;
        } catch (e) {
          return {};
        }
      });
    }

    function loadPagesManifest() {
      return outputPath.apply((outputPath) => {
        if ($dev) return {};

        try {
          const content = fs
            .readFileSync(
              path.join(outputPath, ".next/server/pages-manifest.json"),
            )
            .toString();
          return JSON.parse(content) as Record<string, string>;
        } catch (e) {
          return {};
        }
      });
    }

    function loadPrerenderManifest() {
      return outputPath.apply((outputPath) => {
        if ($dev) return { version: 0, routes: {} };

        try {
          const content = fs
            .readFileSync(
              path.join(outputPath, ".next/prerender-manifest.json"),
            )
            .toString();
          return JSON.parse(content) as {
            version: number;
            routes: Record<string, unknown>;
          };
        } catch (e) {
          console.debug("Failed to load prerender-manifest.json", e);
        }
      });
    }

    function buildPlan() {
      return all([
        [region, logging, outputPath],
        buildId,
        openNextOutput,
        args?.imageOptimization,
        bucket.name,
        revalidationQueue.apply((q) => ({ url: q?.url, arn: q?.arn })),
        revalidationTable.apply((t) => ({ name: t?.name, arn: t?.arn })),
        useServerFunctionPerRouteLoggingInjection(),
      ]).apply(
        ([
          [region, logging, outputPath],
          buildId,
          openNextOutput,
          imageOptimization,
          bucketName,
          { url: revalidationQueueUrl, arn: revalidationQueueArn },
          { name: revalidationTableName, arn: revalidationTableArn },
          serverFunctionPerRouteLoggingInjection,
        ]) => {
          const defaultFunctionProps = {
            environment: {
              CACHE_BUCKET_NAME: bucketName,
              CACHE_BUCKET_KEY_PREFIX: "_cache",
              CACHE_BUCKET_REGION: region,
              ...(revalidationQueueUrl && {
                REVALIDATION_QUEUE_URL: revalidationQueueUrl,
                REVALIDATION_QUEUE_REGION: region,
              }),
              ...(revalidationTableName && {
                CACHE_DYNAMO_TABLE: revalidationTableName,
              }),
            },
            policies: [
              ...(revalidationQueueArn
                ? [
                    {
                      actions: [
                        "sqs:SendMessage",
                        "sqs:GetQueueAttributes",
                        "sqs:GetQueueUrl",
                      ],
                      resources: [revalidationQueueArn],
                    },
                  ]
                : []),
              ...(revalidationTableArn
                ? [
                    {
                      actions: [
                        "dynamodb:BatchGetItem",
                        "dynamodb:GetRecords",
                        "dynamodb:GetShardIterator",
                        "dynamodb:Query",
                        "dynamodb:GetItem",
                        "dynamodb:Scan",
                        "dynamodb:ConditionCheckItem",
                        "dynamodb:BatchWriteItem",
                        "dynamodb:PutItem",
                        "dynamodb:UpdateItem",
                        "dynamodb:DeleteItem",
                        "dynamodb:DescribeTable",
                      ],
                      resources: [
                        revalidationTableArn,
                        `${revalidationTableArn}/*`,
                      ],
                    },
                  ]
                : []),
            ],
            layers:
              logging === "per-route"
                ? [
                    `arn:aws:lambda:${region}:226609089145:layer:sst-extension-arm64:${LAYER_VERSION}`,
                    //              cdk?.server?.architecture?.name === Architecture.X86_64.name
                    //                ? `arn:aws:lambda:${stack.region}:226609089145:layer:sst-extension-amd64:${LAYER_VERSION}`
                    //                : `arn:aws:lambda:${stack.region}:226609089145:layer:sst-extension-arm64:${LAYER_VERSION}`
                  ]
                : undefined,
          };

          return validatePlan(
            transform(args?.transform?.plan, {
              edge: false,
              cloudFrontFunctions: {
                serverCfFunction: {
                  injections: [useCloudFrontFunctionHostHeaderInjection()],
                },
              },
              edgeFunctions: Object.fromEntries(
                Object.entries(openNextOutput.edgeFunctions).map(
                  ([key, value]) => [
                    key,
                    {
                      function: {
                        description: `${name} server`,
                        bundle: path.join(outputPath, value.bundle),
                        handler: value.handler,
                        ...defaultFunctionProps,
                      },
                    },
                  ],
                ),
              ),
              origins: Object.fromEntries(
                Object.entries(openNextOutput.origins).map(([key, value]) => {
                  if (key === "s3") {
                    value = value as OpenNextS3Origin;
                    return [
                      key,
                      {
                        s3: {
                          originPath: value.originPath,
                          copy: value.copy,
                        },
                      },
                    ];
                  }
                  if (key === "imageOptimizer") {
                    value = value as OpenNextImageOptimizationOrigin;
                    return [
                      key,
                      {
                        imageOptimization: {
                          function: {
                            description: `${name} image optimizer`,
                            handler: value.handler,
                            bundle: path.join(outputPath, value.bundle),
                            runtime: "nodejs18.x",
                            architecture: "arm64",
                            environment: {
                              BUCKET_NAME: bucketName,
                              BUCKET_KEY_PREFIX: "_assets",
                            },
                            memory: imageOptimization?.memory ?? "1536 MB",
                          },
                        },
                      },
                    ];
                  }
                  value = value as OpenNextServerFunctionOrigin;
                  return [
                    key,
                    {
                      server: {
                        function: {
                          description: `${name} server`,
                          bundle: path.join(outputPath, value.bundle),
                          handler: value.handler,
                          ...defaultFunctionProps,
                        },
                        streaming: value.streaming,
                        injections:
                          logging === "per-route"
                            ? [serverFunctionPerRouteLoggingInjection]
                            : [],
                      },
                    },
                  ];
                }),
              ),
              behaviors: openNextOutput.behaviors.map((behavior) => {
                return {
                  pattern:
                    behavior.pattern === "*" ? undefined : behavior.pattern,
                  origin: behavior.origin ?? "",
                  cacheType:
                    behavior.origin === "s3" ? "static" : ("server" as const),
                  cfFunction: "serverCfFunction",
                  edgeFunction: behavior.edgeFunction ?? "",
                };
              }),
              serverCachePolicy: {
                allowedHeaders: DEFAULT_CACHE_POLICY_ALLOWED_HEADERS,
              },
              buildId,
            }),
          );
        },
      );
    }

    function createRevalidationQueue() {
      return all([outputPath, openNextOutput]).apply(
        ([outputPath, openNextOutput]) => {
          if (openNextOutput.additionalProps?.disableIncrementalCache) return;

          const revalidationFunction =
            openNextOutput.additionalProps?.revalidationFunction;
          if (!revalidationFunction) return;

          const queue = new aws.sqs.Queue(
            `${name}RevalidationQueue`,
            {
              fifoQueue: true,
              receiveWaitTimeSeconds: 20,
            },
            { parent },
          );
          const consumer = new Function(
            `${name}Revalidator`,
            {
              description: `${name} ISR revalidator`,
              handler: revalidationFunction.handler,
              bundle: path.join(outputPath, revalidationFunction.bundle),
              runtime: "nodejs18.x",
              timeout: "30 seconds",
              permissions: [
                {
                  actions: [
                    "sqs:ChangeMessageVisibility",
                    "sqs:DeleteMessage",
                    "sqs:GetQueueAttributes",
                    "sqs:GetQueueUrl",
                    "sqs:ReceiveMessage",
                  ],
                  resources: [queue.arn],
                },
              ],
              liveDev: false,
              _ignoreCodeChanges: $dev,
            },
            { parent },
          );
          new aws.lambda.EventSourceMapping(
            `${name}RevalidatorEventSource`,
            {
              functionName: consumer.nodes.function.name,
              eventSourceArn: queue.arn,
              batchSize: 5,
            },
            { parent },
          );
          return queue;
        },
      );
    }

    function createRevalidationTable() {
      return openNextOutput.apply((openNextOutput) => {
        if (openNextOutput.additionalProps?.disableTagCache) return;

        return new aws.dynamodb.Table(
          `${name}RevalidationTable`,
          {
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
          },
          { parent },
        );
      });
    }

    function createRevalidationTableSeeder() {
      return all([
        revalidationTable,
        outputPath,
        openNextOutput,
        prerenderManifest,
      ]).apply(
        ([
          revalidationTable,
          outputPath,
          openNextOutput,
          prerenderManifest,
        ]) => {
          if (openNextOutput.additionalProps?.disableTagCache) return;
          if (!openNextOutput.additionalProps?.initializationFunction) return;

          // Provision 128MB of memory for every 4,000 prerendered routes,
          // 1GB per 40,000, up to 10GB. This tends to use ~70% of the memory
          // provisioned when testing.
          const prerenderedRouteCount = Object.keys(
            prerenderManifest?.routes ?? {},
          ).length;
          const seedFn = new Function(
            `${name}RevalidationSeeder`,
            {
              description: `${name} ISR revalidation data seeder`,
              handler:
                openNextOutput.additionalProps.initializationFunction.handler,
              bundle: path.join(
                outputPath,
                openNextOutput.additionalProps.initializationFunction.bundle,
              ),
              runtime: "nodejs18.x",
              timeout: "900 seconds",
              memory: `${Math.min(
                10240,
                Math.max(128, Math.ceil(prerenderedRouteCount / 4000) * 128),
              )} MB`,
              permissions: [
                {
                  actions: [
                    "dynamodb:BatchWriteItem",
                    "dynamodb:PutItem",
                    "dynamodb:DescribeTable",
                  ],
                  resources: [revalidationTable!.arn],
                },
              ],
              environment: {
                CACHE_DYNAMO_TABLE: revalidationTable!.name,
              },
              liveDev: false,
              _ignoreCodeChanges: $dev,
            },
            { parent },
          );
          new aws.lambda.Invocation(
            `${name}RevalidationSeed`,
            {
              functionName: seedFn.nodes.function.name,
              triggers: {
                version: Date.now().toString(),
              },
              input: JSON.stringify({
                RequestType: "Create",
              }),
            },
            { parent, ignoreChanges: $dev ? ["*"] : undefined },
          );
        },
      );
    }

    function removeSourcemaps() {
      // TODO set dependency
      // TODO ensure sourcemaps are removed in function code
      // We don't need to remove source maps in V3
      return;
      return outputPath.apply((outputPath) => {
        const files = globSync("**/*.js.map", {
          cwd: path.join(outputPath, ".open-next", "server-function"),
          nodir: true,
          dot: true,
        });
        for (const file of files) {
          fs.rmSync(
            path.join(outputPath, ".open-next", "server-function", file),
          );
        }
      });
    }

    function useRoutes() {
      if (_routes) return _routes;

      _routes = all([
        outputPath,
        routesManifest,
        appPathRoutesManifest,
        appPathsManifest,
        pagesManifest,
      ]).apply(
        ([
          outputPath,
          routesManifest,
          appPathRoutesManifest,
          appPathsManifest,
          pagesManifest,
        ]) => {
          const dynamicAndStaticRoutes = [
            ...routesManifest.dynamicRoutes,
            ...routesManifest.staticRoutes,
          ].map(({ page, regex }) => {
            const cwRoute = buildCloudWatchRouteName(page);
            const cwHash = buildCloudWatchRouteHash(page);
            const sourcemapPath =
              getSourcemapForAppRoute(page) || getSourcemapForPagesRoute(page);
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
                routesManifest.dynamicRoutes.every(
                  (route) => route.page !== page,
                ) &&
                routesManifest.staticRoutes.every(
                  (route) => route.page !== page,
                ),
            )
            .map((page) => {
              const cwRoute = buildCloudWatchRouteName(page);
              const cwHash = buildCloudWatchRouteHash(page);
              const sourcemapPath = getSourcemapForAppRoute(page);
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
              const cwRoute = buildCloudWatchRouteName(routeDisplayName);
              const cwHash = buildCloudWatchRouteHash(page);
              return {
                route: routeDisplayName,
                regexMatch: dataRouteRegex,
                logGroupPath: `/${cwHash}${cwRoute}`,
              };
            },
          );

          return [
            ...[...dynamicAndStaticRoutes, ...appRoutes].sort((a, b) =>
              a.route.localeCompare(b.route),
            ),
            ...dataRoutes.sort((a, b) => a.route.localeCompare(b.route)),
          ];

          function getSourcemapForAppRoute(page: string) {
            // Step 1: look up in "appPathRoutesManifest" to find the key with
            //         value equal to the page
            // {
            //   "/_not-found": "/_not-found",
            //   "/about/page": "/about",
            //   "/about/profile/page": "/about/profile",
            //   "/page": "/",
            //   "/favicon.ico/route": "/favicon.ico"
            // }
            const appPathRoute = Object.keys(appPathRoutesManifest).find(
              (key) => appPathRoutesManifest[key] === page,
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
            const filePath = appPathsManifest[appPathRoute];
            if (!filePath) return;

            // Step 3: check the .map file exists
            const sourcemapPath = path.join(
              outputPath,
              ".next",
              "server",
              `${filePath}.map`,
            );
            if (!fs.existsSync(sourcemapPath)) return;

            return sourcemapPath;
          }

          function getSourcemapForPagesRoute(page: string) {
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
            const filePath = pagesManifest[page];
            if (!filePath) return;

            // Step 2: check the .map file exists
            const sourcemapPath = path.join(
              outputPath,
              ".next",
              "server",
              `${filePath}.map`,
            );
            if (!fs.existsSync(sourcemapPath)) return;

            return sourcemapPath;
          }
        },
      );

      return _routes;
    }

    function useServerFunctionPerRouteLoggingInjection() {
      return useRoutes().apply(
        (routes) => `
if (event.rawPath) {
  const routeData = ${JSON.stringify(
    // @ts-expect-error
    routes.map(({ regexMatch, prefixMatch, logGroupPath }) => ({
      regex: regexMatch,
      prefix: prefixMatch,
      logGroupPath,
    })),
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
}`,
      );
    }

    function handleMissingSourcemap() {
      // TODO implement
      return;
      //if (doNotDeploy || this.args.edge) return;
      //const hasMissingSourcemap = useRoutes().every(
      //  ({ sourcemapPath, sourcemapKey }) => !sourcemapPath || !sourcemapKey
      //);
      //if (!hasMissingSourcemap) return;
      //// TODO set correct missing sourcemap value
      ////(this.serverFunction as SsrFunction)._overrideMissingSourcemap();
    }

    function disableDefaultLogging() {
      // Temporarily enable default logging even when per-route logging is enabled
      return;
      logging.apply((logging) => {
        if (logging !== "per-route") return;

        const policy = new aws.iam.Policy(
          `${name}DisableLoggingPolicy`,
          {
            policy: interpolate`{
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
                  "${serverFunction.logGroupArn}",
                  "${serverFunction.logGroupArn}:*",
                ],
              }
            ]
          }`,
          },
          { parent },
        );
        new aws.iam.RolePolicyAttachment(
          `${name}DisableLoggingPolicyAttachment`,
          {
            policyArn: policy.arn,
            role: serverFunction.nodes.function.role,
          },
          { parent },
        );
      });
    }

    function uploadSourcemaps() {
      logging.apply((logging) => {
        if (logging !== "per-route") return;

        useRoutes().apply((routes) => {
          routes.forEach(({ sourcemapPath, sourcemapKey }) => {
            if (!sourcemapPath || !sourcemapKey) return;

            new aws.s3.BucketObjectv2(
              `${name}Sourcemap${sanitizeToPascalCase(sourcemapKey)}`,
              {
                bucket: region.apply((region) =>
                  bootstrap.forRegion(region).then((b) => b.asset),
                ),
                source: new asset.FileAsset(sourcemapPath),
                key: serverFunction!.nodes.function.arn.apply((arn) =>
                  path.posix.join("sourcemaps", arn, sourcemapKey),
                ),
              },
              { parent, retainOnDelete: true },
            );
          });
        });
      });
    }

    function buildCloudWatchRouteName(route: string) {
      return route.replace(/[^a-zA-Z0-9_\-/.#]/g, "");
    }

    function buildCloudWatchRouteHash(route: string) {
      const hash = crypto.createHash("sha256");
      hash.update(route);
      return hash.digest("hex").substring(0, 8);
    }
  }

  /**
   * The CloudFront URL of the website.
   */
  public get url() {
    return this.cdn.url;
  }

  /**
   * If the custom domain is enabled, this is the URL of the website with the
   * custom domain.
   */
  public get domainUrl() {
    return this.cdn.domainUrl;
  }

  /**
   * The internally created CDK resources.
   */
  public get nodes() {
    return {
      server: this.server,
      assets: this.assets,
      //cdn: this.cdn,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      type: `{ url: string; }`,
      value: {
        url: this.url,
      },
    };
  }
}
