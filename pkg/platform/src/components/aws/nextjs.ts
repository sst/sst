import fs from "fs";
import path from "path";
import crypto from "crypto";
import { globSync } from "glob";
import { ComponentResourceOptions, Output, all } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Size } from "../size.js";
import { Function } from "./function.js";
import {
  Plan,
  SsrSiteArgs,
  createBucket,
  createServersAndDistribution,
  prepare,
  useCloudFrontFunctionHostHeaderInjection,
  validatePlan,
} from "./ssr-site.js";
import { Cdn } from "./cdn.js";
import { Bucket } from "./bucket.js";
import { Component } from "../component.js";
import { Hint } from "../hint.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import type { Input } from "../input.js";
import { Cache } from "./providers/cache.js";
import { Queue } from "./queue.js";
import { buildApp } from "../base/base-ssr-site.js";

const DEFAULT_OPEN_NEXT_VERSION = "3.0.0-rc.16";
const DEFAULT_CACHE_POLICY_ALLOWED_HEADERS = ["x-open-next-cache-key"];

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
   * The number of instances of the [server function](#nodes-server) to keep warm. This is useful for cases where you are experiencing long cold starts. The default is to not keep any instances warm.
   *
   * This works by starting a serverless cron job to make _n_ concurrent requests to the server function every few minutes. Where _n_ is the number of instances to keep warm.
   *
   * @default `0`
   */
  warm?: SsrSiteArgs["warm"];
  /**
   * Permissions and the resources that the [server function](#nodes-server) in your Next.js app needs to access. These permissions are used to create the function's IAM role.
   *
   * :::tip
   * If you `link` the function to a resource, the permissions to access it are
   * automatically added.
   * :::
   *
   * @example
   * Allow reading and writing to an S3 bucket called `my-bucket`.
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["s3:GetObject", "s3:PutObject"],
   *       resources: ["arn:aws:s3:::my-bucket/*"]
   *     },
   *   ]
   * }
   * ```
   *
   * Perform all actions on an S3 bucket called `my-bucket`.
   *
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["s3:*"],
   *       resources: ["arn:aws:s3:::my-bucket/*"]
   *     },
   *   ]
   * }
   * ```
   *
   * Grant permissions to access all resources.
   *
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["*"],
   *       resources: ["*"]
   *     },
   *   ]
   * }
   * ```
   */
  permissions?: SsrSiteArgs["permissions"];
  /**
   * Path to the directory where your Next.js app is located. This path is relative to your `sst.config.ts`.
   *
   * By default this assumes your Next.js app is in the root of your SST app.
   * @default `"."`
   *
   * @example
   *
   * If your Next.js app is in a package in your monorepo.
   *
   * ```js
   * {
   *   path: "packages/web"
   * }
   * ```
   */
  path?: SsrSiteArgs["path"];
  /**
   * [Link resources](/docs/linking/) to your Next.js app. This will:
   *
   * 1. Grant the permissions needed to access the resources.
   * 2. Allow you to access it in your site using the [SDK](/docs/reference/sdk/).
   *
   * @example
   *
   * Takes a list of resources to link to the function.
   *
   * ```js
   * {
   *   link: [bucket, stripeKey]
   * }
   * ```
   */
  link?: SsrSiteArgs["link"];
  /**
   * Configure how the CloudFront cache invalidations are handled. This is run after your Next.js app has been deployed.
   * :::tip
   * You get 1000 free invalidations per month. After that you pay $0.005 per invalidation path. [Read more here](https://aws.amazon.com/cloudfront/pricing/).
   * :::
   * @default `&lcub;paths: "all", wait: false&rcub;`
   * @example
   * Turn off invalidations.
   * ```js
   * {
   *   invalidation: false
   * }
   * ```
   * Wait for all paths to be invalidated.
   * ```js
   * {
   *   invalidation: {
   *     paths: "all",
   *     wait: true
   *   }
   * }
   * ```
   */
  invalidation?: SsrSiteArgs["invalidation"];
  /**
   * The command used internally to build your Next.js app. It uses OpenNext with the `openNextVersion`.
   *
   * @default `"npx --yes open-next@OPEN_NEXT_VERSION build"`
   *
   * @example
   *
   * If you want to use a custom `build` script from your `package.json`.
   * ```js
   * {
   *   buildCommand: "npm run build"
   * }
   * ```
   */
  buildCommand?: SsrSiteArgs["buildCommand"];
  /**
   * Set [environment variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables) in your Next.js app. These are made available:
   *
   * 1. In `next build`, they are loaded into `process.env`.
   * 2. Locally while running `sst dev next dev`.
   *
   * :::tip
   * You can also `link` resources to your Next.js app and access them in a type-safe way with the [SDK](/docs/reference/sdk/). We recommend linking since it's more secure.
   * :::
   *
   * Recall that in Next.js, you need to prefix your environment variables with `NEXT_PUBLIC_` to access these in the browser. [Read more here](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser).
   *
   * @example
   * ```js
   * {
   *   environment: {
   *     API_URL: api.url,
   *     // Accessible in the browser
   *     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123"
   *   }
   * }
   * ```
   */
  environment?: SsrSiteArgs["environment"];
  /**
   * Set a custom domain for your Next.js app.
   *
   * Automatically manages domains hosted on AWS Route 53, Cloudflare, and Vercel. For other
   * providers, you'll need to pass in a `cert` that validates domain ownership and add the
   * DNS records.
   *
   * :::tip
   * Built-in support for AWS Route 53, Cloudflare, and Vercel. And manual setup for other
   * providers.
   * :::
   *
   * @example
   *
   * By default this assumes the domain is hosted on Route 53.
   *
   * ```js
   * {
   *   domain: "example.com"
   * }
   * ```
   *
   * For domains hosted on Cloudflare.
   *
   * ```js
   * {
   *   domain: {
   *     name: "example.com",
   *     dns: sst.cloudflare.dns()
   *   }
   * }
   * ```
   *
   * Specify a `www.` version of the custom domain.
   *
   * ```js
   * {
   *   domain: {
   *     name: "domain.com",
   *     redirects: ["www.domain.com"]
   *   }
   * }
   * ```
   */
  domain?: SsrSiteArgs["domain"];
  /**
   * Configure how the Next.js app assets are uploaded to S3.
   *
   * By default, this is set to the following. Read more about these options below.
   * ```js
   * {
   *   assets: {
   *     textEncoding: "utf-8",
   *     versionedFilesCacheHeader: "public,max-age=31536000,immutable",
   *     nonVersionedFilesCacheHeader: "public,max-age=0,s-maxage=86400,stale-while-revalidate=8640"
   *   }
   * }
   * ```
   * Read more about these options below.
   * @default `Object`
   */
  assets?: SsrSiteArgs["assets"];
  /**
   * Configure the [OpenNext](https://open-next.js.org) version used to build the Next.js app.
   *
   * :::note
   * This does not automatically update to the latest OpenNext version. It remains pinned to the version of SST you have.
   * :::
   *
   * By default, this is pinned to the version of OpenNext that was released with the SST version you are using. You can [find this in the source](https://github.com/sst/ion/blob/dev/pkg/platform/src/components/aws/nextjs.ts) under `DEFAULT_OPEN_NEXT_VERSION`.
   *
   * @default The latest version of OpenNext
   * @example
   * ```js
   * {
   *   openNextVersion: "3.0.0-rc.3"
   * }
   * ```
   */
  openNextVersion?: Input<string>;
  /**
   * Configure the Lambda function used for image optimization.
   * @default `&lcub;memory: "1024 MB"&rcub;`
   */
  imageOptimization?: {
    /**
     * The amount of memory allocated to the image optimization function.
     * Takes values between 128 MB and 10240 MB in 1 MB increments.
     *
     * @default `"1024 MB"`
     * @example
     * ```js
     * {
     *   imageOptimization: {
     *     memory: "512 MB"
     *   }
     * }
     * ```
     */
    memory?: Size;
    /**
     * If set to true, already computed image will return 304 Not Modified.
     * This means that image needs to be **immutable**, the etag will be computed
     * based on the image href, format and width and the next BUILD_ID.
     * @default false
     * @example
     * ```js
     * {
     *   imageOptimization: {
     *     staticEtag: true,
     *   }
     * }
     */
    staticEtag?: boolean;
  };
}

/**
 * The `Nextjs` component lets you deploy [Next.js](https://nextjs.org) apps on AWS. It uses
 * [OpenNext](https://open-next.js.org) to build your Next.js app, and transforms the build
 * output to a format that can be deployed to AWS.
 *
 * @example
 *
 * #### Minimal example
 *
 * Deploy the Next.js app that's in the project root.
 *
 * ```js
 * new sst.aws.Nextjs("MyWeb");
 * ```
 *
 * #### Change the path
 *
 * Deploys a Next.js app in the `my-next-app/` directory.
 *
 * ```js {2}
 * new sst.aws.Nextjs("MyWeb", {
 *   path: "my-next-app/"
 * });
 * ```
 *
 * #### Add a custom domain
 *
 * Set a custom domain for your Next.js app.
 *
 * ```js {2}
 * new sst.aws.Nextjs("MyWeb", {
 *   domain: "my-app.com"
 * });
 * ```
 *
 * #### Redirect www to apex domain
 *
 * Redirect `www.my-app.com` to `my-app.com`.
 *
 * ```js {4}
 * new sst.aws.Nextjs("MyWeb", {
 *   domain: {
 *     name: "my-app.com",
 *     redirects: ["www.my-app.com"]
 *   }
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to your Next.js app. This will grant permissions
 * to the resources and allow you to access it in your app.
 *
 * ```ts {4}
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your Next.js app.
 *
 * ```ts title="app/page.tsx"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 */
export class Nextjs extends Component implements Link.Linkable {
  private cdn: Output<Cdn>;
  private assets: Bucket;
  private server: Output<Function>;

  constructor(
    name: string,
    args: NextjsArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    super(__pulumiType, name, args, opts);

    let _routes: Output<
      ({
        route: string;
        logGroupPath: string;
        sourcemapPath?: string;
        sourcemapKey?: string;
      } & ({ regexMatch: string } | { prefixMatch: string }))[]
    >;

    const parent = this;
    const buildCommand = normalizeBuildCommand();
    const { sitePath, partition, region } = prepare(args, opts);
    const { access, bucket } = createBucket(parent, name, partition, args);
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

    this.assets = bucket;
    this.cdn = distribution;
    this.server = serverFunction;
    this.registerOutputs({
      _hint: $dev
        ? undefined
        : all([this.cdn.domainUrl, this.cdn.url]).apply(
            ([domainUrl, url]) => domainUrl ?? url,
          ),
      _metadata: {
        mode: $dev ? "placeholder" : "deployed",
        path: sitePath,
        url: distribution.apply((d) => d.domainUrl ?? d.url),
        edge: plan.edge,
        server: serverFunction.arn,
      },
    });

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
            handler: "index.handler",
            bundle: path.join(
              outputPath,
              ".open-next/image-optimization-function",
            ),
            streaming: false,
          },
          default: {
            type: "function",
            handler: "index.handler",
            bundle: path.join(
              outputPath,
              ".open-next/server-functions/default",
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
        [region, outputPath],
        buildId,
        openNextOutput,
        args?.imageOptimization,
        [bucket.arn, bucket.name],
        revalidationQueue.apply((q) => ({ url: q?.url, arn: q?.arn })),
        revalidationTable.apply((t) => ({ name: t?.name, arn: t?.arn })),
      ]).apply(
        ([
          [region, outputPath],
          buildId,
          openNextOutput,
          imageOptimization,
          [bucketArn, bucketName],
          { url: revalidationQueueUrl, arn: revalidationQueueArn },
          { name: revalidationTableName, arn: revalidationTableArn },
        ]) => {
          const defaultFunctionProps = {
            runtime: "nodejs20.x" as const,
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
            permissions: [
              // access to the cache data
              {
                actions: ["s3:GetObject", "s3:PutObject"],
                resources: [`${bucketArn}/*`],
              },
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
          };

          return validatePlan({
            edge: false,
            cloudFrontFunctions: {
              serverCfFunction: {
                injections: [
                  useCloudFrontFunctionHostHeaderInjection(),
                  useCloudFrontFunctionCacheHeaderKey(),
                  useCloudfrontGeoHeadersInjection(),
                ],
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
                          runtime: "nodejs20.x",
                          architecture: "arm64",
                          environment: {
                            BUCKET_NAME: bucketName,
                            BUCKET_KEY_PREFIX: "_assets",
                            ...(imageOptimization?.staticEtag
                              ? { OPENNEXT_STATIC_ETAG: "true" }
                              : {}),
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
                cfFunction: "serverCfFunction" as const,
                edgeFunction: behavior.edgeFunction ?? "",
              };
            }),
            serverCachePolicy: {
              allowedHeaders: DEFAULT_CACHE_POLICY_ALLOWED_HEADERS,
            },
            buildId,
          }) as Plan;
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

          const queue = new Queue(
            `${name}RevalidationQueue`,
            {
              fifo: true,
              transform: {
                queue: (args) => {
                  args.receiveWaitTimeSeconds = 20;
                },
              },
            },
            { parent },
          );
          queue.subscribe(
            {
              description: `${name} ISR revalidator`,
              handler: revalidationFunction.handler,
              bundle: path.join(outputPath, revalidationFunction.bundle),
              runtime: "nodejs20.x",
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
              live: false,
              _ignoreCodeChanges: $dev,
            },
            {
              transform: {
                eventSourceMapping: (args) => {
                  args.batchSize = 5;
                },
              },
            },
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
              runtime: "nodejs20.x",
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
              live: false,
              _ignoreCodeChanges: $dev,
              _skipMetadata: true,
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

    function useCloudFrontFunctionCacheHeaderKey() {
      // This function is used to improve cache hit ratio by setting the cache key
      // based on the request headers and the path. `next/image` only needs the
      // accept header, and this header is not useful for the rest of the query
      return `
function getHeader(key) {
  var header = request.headers[key];
  if (header) {
    if (header.multiValue) {
      return header.multiValue.map((header) => header.value).join(",");
    }
    if (header.value) {
      return header.value;
    }
  }
  return "";
}
var cacheKey = "";
if (request.uri.startsWith("/_next/image")) {
  cacheKey = getHeader("accept");
} else {
  cacheKey =
    getHeader("rsc") +
    getHeader("next-router-prefetch") +
    getHeader("next-router-state-tree") +
    getHeader("next-url") +
    getHeader("x-prerender-revalidate");
}
if (request.cookies["__prerender_bypass"]) {
  cacheKey += request.cookies["__prerender_bypass"]
    ? request.cookies["__prerender_bypass"].value
    : "";
}
var crypto = require("crypto");

var hashedKey = crypto.createHash("md5").update(cacheKey).digest("hex");
request.headers["x-open-next-cache-key"] = { value: hashedKey };
`;
    }

    function useCloudfrontGeoHeadersInjection() {
      // Inject the CloudFront viewer country, region, latitude, and longitude headers into the request headers
      // for OpenNext to use them
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
   * The URL of the Next.js app.
   *
   * If the `domain` is set, this is the URL with the custom domain.
   * Otherwise, it's the autogenerated CloudFront URL.
   */
  public get url() {
    return all([this.cdn.domainUrl, this.cdn.url]).apply(
      ([domainUrl, url]) => domainUrl ?? url,
    );
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The AWS Lambda server function that renders the app.
       */
      server: this.server,
      /**
       * The Amazon S3 Bucket that stores the assets.
       */
      assets: this.assets,
      /**
       * The Amazon CloudFront CDN that serves the app.
       */
      cdn: this.cdn,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        url: this.url,
      },
    };
  }
}

const __pulumiType = "sst:aws:Nextjs";
// @ts-expect-error
Nextjs.__pulumiType = __pulumiType;
