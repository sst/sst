import fs from "fs";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";
import type { Loader, BuildOptions } from "esbuild";
import {
  Output,
  ComponentResourceOptions,
  asset,
  output,
  all,
  interpolate,
  jsonStringify,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { build } from "../../runtime/node.js";
import { FunctionCodeUpdater } from "./providers/function-code-updater.js";
import { bootstrap } from "./helpers/bootstrap.js";
import { LogGroup } from "./providers/log-group.js";
import { Duration, toSeconds } from "../duration.js";
import { Size, toMBs } from "../size.js";
import { Component, Prettify, Transform, transform } from "../component.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import { Warp } from "../warp.js";
import type { Input } from "../input.js";

const RETENTION = {
  "1 day": 1,
  "3 days": 3,
  "5 days": 5,
  "1 week": 7,
  "2 weeks": 14,
  "1 month": 30,
  "2 months": 60,
  "3 months": 90,
  "4 months": 120,
  "5 months": 150,
  "6 months": 180,
  "1 year": 365,
  "13 months": 400,
  "18 months": 545,
  "2 years": 731,
  "3 years": 1096,
  "5 years": 1827,
  "6 years": 2192,
  "7 years": 2557,
  "8 years": 2922,
  "9 years": 3288,
  "10 years": 3653,
  forever: 0,
};

export type FunctionPermissionArgs = {
  /**
   * The [IAM actions](https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html#actions_table) that can be performed.
   */
  actions: string[];
  /**
   * The resources(s) specified using the [IAM ARN format](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html).
   */
  resources: Input<string>[];
};

interface FunctionUrlCorsArgs
  extends Omit<
    aws.types.input.lambda.FunctionUrlCors,
    | "maxAge"
    | "allowHeaders"
    | "allowOrigins"
    | "allowMethods"
    | "exposeHeaders"
    | "allowCredentials"
  > {
  /**
   * Allow cookies or other credentials in requests to the function URL.
   * @default `false`
   */
  allowCredentials?: Input<boolean>;
  /**
   * The HTTP headers that origins can include in requests to the function URL.
   * @example
   * ```js
   * {
   *   allowHeaders: ["date", "keep-alive", "x-custom-header"]
   * }
   * ```
   */
  allowHeaders?: Input<Input<string>[]>;
  /**
   * The origins that can access the function URL.
   * @example
   * ```js
   * {
   *   allowOrigins: ["https://www.example.com", "http://localhost:60905"]
   * }
   * ```
   * Or the wildcard character for all origins.
   * ```js
   * {
   *   allowOrigins: ["*"]
   * }
   * ```
   */
  allowOrigins?: Input<Input<string>[]>;
  /**
   * The HTTP headers in your function response that you want to expose to origins that call the function URL.
   */
  exposeHeaders?: Input<Input<string>[]>;
  /**
   * The HTTP methods that are allowed when calling the function URL.
   * @example
   * ```js
   * {
   *   allowMethods: ["GET", "POST", "DELETE"]
   * }
   * ```
   * Or the wildcard character for all methods.
   * ```js
   * {
   *   allowMethods: ["*"]
   * }
   * ```
   */
  allowMethods?: Input<
    Input<
      "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT"
    >[]
  >;
  /**
   * The maximum amount of time the browser can cache results of a preflight request. By
   * default the browser doesn't cache the results. The maximum value is `86400 seconds` or `1 day`.
   * @default `"0 seconds"`
   */
  maxAge?: Input<Duration>;
}

export interface FunctionArgs {
  liveDev?: Input<false>;
  /**
   * A description for the function. This is displayed in the AWS Console.
   * @example
   * ```js
   * {
   *   description: "Handler function for my nightly cron job."
   * }
   * ```
   */
  description?: Input<string>;
  /**
   * The runtime environment for the function. Support for other runtimes is on our roadmap.
   *
   * @default `"nodejs18.x"`
   * @example
   * ```js
   * {
   *   runtime: "nodejs20.x"
   * }
   * ```
   */
  runtime?: Input<"nodejs18.x" | "nodejs20.x" | "provided.al2023">;
  /**
   * Path to the source code directory for the function. By default, the handler is
   * bundled with [esbuild](https://esbuild.github.io/). Use `bundle` to skip bundling.
   *
   * :::caution
   * Use `bundle` only when you want to bundle the function yourself.
   * :::
   *
   * If the `bundle` option is specified, the `handler` needs to be in the root of the bundle.
   *
   * @example
   *
   * Here, the entire `packages/functions/src` directory is zipped. And the handler is
   * in the `src` directory.
   *
   * ```js
   * {
   *   bundle: "packages/functions/src",
   *   handler: "index.handler"
   * }
   * ```
   */
  bundle?: Input<string>;
  /**
   * Path to the handler for the function with the format `{file}.{method}`. Note that, the
   * file extension is not specified.
   *
   * The handler path is relative to the root of your SST app.
   *
   * @example
   *
   * Here there is a file called `index.js` (or `.ts`) in the `packages/functions/src/`
   * directory with an exported method called `handler`.
   *
   * ```js
   * {
   *   handler: "packages/functions/src/index.handler"
   * }
   * ```
   *
   * If `bundle` is specified, the handler needs to be in the root of the bundle directory.
   *
   * ```js
   * {
   *   bundle: "packages/functions/src",
   *   handler: "index.handler"
   * }
   * ```
   */
  handler: Input<string>;
  /**
   * The amount of time that Lambda allows a function to run before stopping it.
   * @default `"20 seconds"`
   * @example
   * ```js
   * {
   *   timeout: "900 seconds"
   * }
   * ```
   */
  timeout?: Input<Duration>;
  /**
   * The amount of memory allocated for the function. Takes values between 128 MB
   * and 10240 MB in 1 MB increments.  The amount of memory affects the amount of
   * virtual CPU available to the function.
   *
   * :::tip
   * While functions with less memory are cheaper, larger functions can process faster.
   * And might end up being more [cost effective](https://docs.aws.amazon.com/lambda/latest/operatorguide/computing-power.html).
   * :::
   *
   * @default `"1024 MB"`
   * @example
   * ```js
   * {
   *   memory: "10240 MB"
   * }
   * ```
   */
  memory?: Input<Size>;
  /**
   * Key-value pairs of values that are set as [Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).
   * The keys need to:
   * - Start with a letter
   * - Be at least 2 characters long
   * - Contain only letters, numbers, or underscores
   *
   * They can be accessed in your function using `process.env.<key>`.
   *
   * :::note
   * The total size of the environment variables cannot exceed 4 KB.
   * :::
   *
   * @example
   *
   * ```js
   * {
   *   environment: {
   *     DEBUG: "true"
   *   }
   * }
   * ```
   */
  environment?: Input<Record<string, Input<string>>>;
  /**
   * Permissions and the resources that the function needs to access. These permissions are
   * used to create the function's IAM role.
   *
   * :::tip
   * If you `link` the function to a resource, the permissions to access it are
   * automatically added.
   * :::
   *
   * @example
   * Allow the function to read and write to an S3 bucket called `my-bucket`.
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["s3:GetObject", "s3:PutObject"],
   *       resources: ["arn:aws:s3:::my-bucket/*"],
   *     },
   *   ]
   * }
   * ```
   *
   * Allow the function to perform all actions on an S3 bucket called `my-bucket`.
   *
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["s3:*"],
   *       resources: ["arn:aws:s3:::my-bucket/*"],
   *     },
   *   ]
   * }
   * ```
   *
   * Granting the function permissions to access all resources.
   *
   * ```js
   * {
   *   permissions: [
   *     {
   *       actions: ["*"],
   *       resources: ["*"],
   *     },
   *   ]
   * }
   * ```
   */
  permissions?: Input<Prettify<FunctionPermissionArgs>[]>;
  /**
   * [Link resources](/docs/linking/) to the function. The will be grant permissions
   * to the resources and allow you to access it in your handler.
   *
   * @example
   *
   * Takes a list of resources to link to the function.
   *
   * ```js
   * {
   *   link: [myBucket, stripeKey],
   * }
   * ```
   */
  link?: Input<any[]>;
  /**
   * Enable streaming for the function. Stream is only supported when using the function
   * `url` and not when using it with API Gateway.
   *
   * :::tip
   * You'll need to [wrap your handler](https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html) with `awslambda.streamifyResponse()` to enable streaming.
   * :::
   *
   * @default `false`
   * @example
   * ```js
   * {
   *   streaming: true
   * }
   * ```
   */
  streaming?: Input<boolean>;
  /**
   * @internal
   */
  injections?: Input<string[]>;
  /**
   * Configure the function logs in CloudWatch.
   * @default `&lcub;retention: "forever"&rcub;`
   * @example
   * ```js
   * {
   *   logging: {
   *     retention: "1 week"
   *   }
   * }
   * ```
   */
  logging?: Input<{
    /**
     * The duration the function logs are kept in CloudWatch.
     * @default `forever`
     */
    retention?: Input<keyof typeof RETENTION>;
  }>;
  /**
   * The [architecture](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html)
   * of the Lambda function.
   *
   * @default `"x86_64"`
   * @example
   * ```js
   * {
   *   architecture: "arm64"
   * }
   * ```
   */
  architecture?: Input<"x86_64" | "arm64">;
  /**
   * Enable [Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html).
   * These are dedicated endpoints for your Lambda functions.
   * @default `false`
   * @example
   * Enable it with the default options.
   * ```js
   * {
   *   url: true
   * }
   * ```
   *
   * Enable it and configure the options.
   * ```js
   * {
   *   url: {
   *     authorization: "iam",
   *     cors: {
   *       allowedOrigins: ['https://example.com'],
   *     }
   *   }
   * }
   * ```
   */
  url?: Input<
    | boolean
    | {
        /**
         * The authorization used for the function URL. Supports [IAM authorization](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html).
         * @default `"none"`
         * @example
         * ```js
         * {
         *   url: {
         *     authorization: "iam",
         *   },
         * }
         * ```
         */
        authorization?: Input<"none" | "iam">;
        /**
         * Customize the CORS (Cross-origin resource sharing) settings for the function URL.
         * @default `true`
         * @example
         * Disable CORS.
         * ```js
         * {
         *   url: {
         *     cors: true,
         *   },
         * }
         * ```
         * Only enable the `GET` and `POST` methods for `https://example.com`.
         * ```js
         * {
         *   url: {
         *     cors: {
         *       allowedMethods: ["GET", "POST"],
         *       allowedOrigins: ['https://example.com'],
         *     },
         *   },
         * }
         * ```
         */
        cors?: Input<boolean | Prettify<FunctionUrlCorsArgs>>;
      }
  >;
  /**
   * Configure how your function is bundled. By default, SST will bundle your function
   * code using [esbuild](https://esbuild.github.io/). This tree shakes your code to
   * only include what's used; reducing the size of your function package and improving
   * cold starts.
   */
  nodejs?: Input<{
    // TODO exclude
    /**
     * Configure additional esbuild loaders for other file extensions. This is useful
     * when your code is importing non-JS files like `.png`, `.css`, etc.
     *
     * @example
     * ```js
     * nodejs: {
     *   loader: {
     *    ".png": "file"
     *   }
     * }
     * ```
     */
    loader?: Input<Record<string, Loader>>;
    /**
     * Packages that will be excluded from the bundle. Certain npm packages cannot be
     * bundled using esbuild. This allows you to exclude them from the bundle and instead
     * install them into a `node_modules/` directory in the function package.
     *
     * These packages are excluded when esbuild is traversing the imports in your code to
     * generate the bundle. So these are the package names as seen in the imports. Also,
     * this works on packages that are not directly imported by your code.
     *
     * @example
     * ```js
     * nodejs: {
     *   install: ["pg"]
     * }
     * ```
     */
    install?: Input<string[]>;
    /**
     * Use this to insert a string at the beginning of the generated JS file.
     *
     * @example
     * ```js
     * nodejs: {
     *   banner: "console.log('Function starting')"
     * }
     * ```
     */
    banner?: Input<string>;
    /**
     * This allows you to customize esbuild config that is used.
     *
     * :::tip
     * Check out the JS version of the code snippets in the esbuild docs for the
     * [build options](https://esbuild.github.io/api/#build).
     * :::
     *
     */
    esbuild?: Input<BuildOptions>;
    /**
     * Enable or disable if the function code is minified when bundled.
     *
     * @default `true`
     *
     * @example
     * ```js
     * nodejs: {
     *   minify: false
     * }
     * ```
     */
    minify?: Input<boolean>;
    /**
     * Configure the format of the generated JS code; ESM or CommonJS.
     *
     * @default `"esm"`
     *
     * @example
     * ```js
     * nodejs: {
     *   format: "cjs"
     * }
     * ```
     */
    format?: Input<"cjs" | "esm">;
    /**
     * Configure if source maps are added to the function bundle for **production**. Since they
     * increase payload size and potentially cold starts, they are not added by default.
     * However, they are always generated during `sst dev`.
     *
     * :::tip[SST Console]
     * For the [Console](/docs/console/), source maps are always generated and uploaded
     * to your bootstrap bucket. These are then downloaded and used to displayed
     * in the console.
     * :::
     *
     * @default `false`
     *
     * @example
     * ```js
     * nodejs: {
     *   sourcemap: true
     * }
     * ```
     */
    sourcemap?: Input<boolean>;
    /**
     * If enabled, modules that are dynamically imported will be bundled in their own files
     * with common dependencies placed in shared chunks. This can help reduce cold starts
     * as your function grows in size.
     *
     * @default `false`
     *
     * @example
     * ```js
     * nodejs: {
     *   splitting: true
     * }
     * ```
     */
    splitting?: Input<boolean>;
  }>;
  /**
   * Add additional files to copy into the function package. Takes a list of objects
   * with `from` and `to` paths. These will be copied over before the function package
   * is zipped up.
   *
   * @example
   *
   * Copying over a single file from the `src` directory to the `src/` directory of the
   * function package.
   *
   * ```js
   * {
   *   copyFiles: [{ from: "src/index.js" }]
   * }
   *```
   *
   * Copying over a single file from the `src` directory to the `core/src` directory in
   * the function package.
   *
   * ```js
   * {
   *   copyFiles: [{ from: "src/index.js", to: "core/src/index.js" }]
   * }
   *```
   *
   * Copying over a couple of files.
   *
   * ```js
   * {
   *   copyFiles: [
   *     { from: "src/this.js", to: "core/src/this.js" },
   *     { from: "src/that.js", to: "core/src/that.js" }
   *   ]
   * }
   *```
   */
  copyFiles?: Input<
    {
      /**
       * Source path relative to the `sst.config.ts`.
       */
      from: Input<string>;
      /**
       * Destination path relative to function root in the package. By default, it
       * creates the same directory structure as the `from` path and copies the file.
       *
       * @default The `from` path in the function package
       */
      to?: Input<string>;
    }[]
  >;
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Lambda Function resource.
     */
    function?: Transform<aws.lambda.FunctionArgs>;
  };
  /**
   * @internal
   */
  _ignoreCodeChanges?: boolean;
}

/**
 * The `Function` component lets you add serverless functions to your app.
 * It uses [AWS Lambda](https://aws.amazon.com/lambda/).
 *
 * :::note
 * Currently supports Node.js functions only. Support for other runtimes is on the roadmap.
 * :::
 *
 * @example
 *
 * #### Minimal example
 *
 * Pass in the path to your handler function.
 *
 * ```ts
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 * });
 * ```
 *
 * #### Set additional config
 *
 * Pass in additional Lambda config.
 *
 * ```ts {3,4}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   timeout: "3 minutes",
 *   memory: "1024 MB",
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to the function. The will be grant permissions
 * to the resources and allow you to access it in your handler.
 *
 * ```ts {3}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   link: [myBucket, stripeKey],
 * });
 * ```
 *
 * #### Set environment variables
 *
 * Set environment variables for the function. Available in your handler as `process.env`.
 *
 * ```ts {4}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   environment: {
 *     DEBUG: "true",
 *   },
 * });
 * ```
 *
 * #### Enable function URLs
 *
 * Enable function URLs to invoke the function over HTTP.
 *
 * ```ts {3}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   url: true,
 * });
 * ```
 *
 * #### Bundling
 *
 * By default, SST will bundle your function code using [esbuild](https://esbuild.github.io/).
 *  You can customize this using the `nodejs` property.
 *
 * ```ts
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   nodejs: {
 *     install: ["pg"],
 *   },
 * });
 * ```
 *
 * Or override it entirely by passing in your own function `bundle`.
 *
 */
export class Function
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private function: Output<aws.lambda.Function>;
  private role: Output<aws.iam.Role>;
  private logGroup: LogGroup;
  private fnUrl: Output<aws.lambda.FunctionUrl | undefined>;
  private missingSourcemap?: boolean;

  constructor(
    name: string,
    args: FunctionArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:aws:Function", name, args, opts);

    const parent = this;
    const dev = output(args.liveDev).apply((v) => $dev && v !== false);
    const region = normalizeRegion();
    const injections = normalizeInjections();
    const runtime = normalizeRuntime();
    const timeout = normalizeTimeout();
    const memory = normalizeMemory();
    const architectures = normalizeArchitectures();
    const environment = normalizeEnvironment();
    const streaming = normalizeStreaming();
    const logging = normalizeLogging();
    const url = normalizeUrl();
    const copyFiles = normalizeCopyFiles();

    const linkData = buildLinkData();
    const linkPermissions = buildLinkPermissions();
    const { bundle, handler: handler0 } = buildHandler();
    const { handler, wrapper } = buildHandlerWrapper();
    const role = createRole();
    const zipPath = zipBundleFolder();
    const bundleHash = calculateHash();
    const file = createBucketObject();
    const fn = createFunction();
    const codeUpdater = updateFunctionCode();

    const logGroup = createLogGroup();
    const fnUrl = createUrl();

    const links = output(linkData).apply((input) =>
      input.map((item) => item.name),
    );

    all([
      dev,
      name,
      links,
      args.handler,
      args.bundle,
      args.runtime,
      args.nodejs,
    ]).apply(([dev, name, links, handler, bundle, runtime, nodejs]) => {
      if (!dev) return;
      Warp.register({
        functionID: name,
        links,
        handler: handler,
        bundle: bundle,
        runtime: runtime || "nodejs18.x",
        properties: nodejs,
      });
    });
    all([bundle, handler]).apply(([bundle, handler]) => {
      Link.Receiver.register(bundle || handler, links, environment);
    });
    this.registerOutputs({
      _metadata: {
        handler: args.handler,
      },
    });

    this.function = codeUpdater.version.apply(() => fn);
    this.role = role;
    this.logGroup = logGroup;
    this.fnUrl = fnUrl;

    function normalizeRegion() {
      return all([
        $app.providers?.aws?.region!,
        (opts?.provider as aws.Provider)?.region,
      ]).apply(([appRegion, region]) => region ?? appRegion);
    }

    function normalizeInjections() {
      return output(args.injections).apply((injections) => injections ?? []);
    }

    function normalizeRuntime() {
      return all([args.runtime, dev]).apply(([v, dev]) =>
        dev ? "provided.al2023" : v ?? "nodejs18.x",
      );
    }

    function normalizeTimeout() {
      return output(args.timeout).apply((timeout) => timeout ?? "20 seconds");
    }

    function normalizeMemory() {
      return output(args.memory).apply((memory) => memory ?? "1024 MB");
    }

    function normalizeArchitectures() {
      return output(args.architecture).apply((arc) =>
        arc === "arm64" ? ["arm64"] : ["x86_64"],
      );
    }

    function normalizeEnvironment() {
      return all([args.environment, dev]).apply(([environment, dev]) => {
        const result = environment ?? {};
        if (dev) {
          result.SST_FUNCTION_ID = name;
          result.SST_APP = $app.name;
          result.SST_STAGE = $app.stage;
        }
        return result;
      });
    }

    function normalizeStreaming() {
      return output(args.streaming).apply((streaming) => streaming ?? false);
    }

    function normalizeLogging() {
      return output(args.logging).apply((logging) => ({
        ...logging,
        retention: logging?.retention ?? "forever",
      }));
    }

    function normalizeUrl() {
      return output(args.url).apply((url) => {
        if (url === false || url === undefined) return;
        if (url === true) {
          url = {};
        }

        // normalize authorization
        const defaultAuthorization = "none" as const;
        const authorization = url.authorization ?? defaultAuthorization;

        // normalize cors
        const defaultCors: aws.types.input.lambda.FunctionUrlCors = {
          allowHeaders: ["*"],
          allowMethods: ["*"],
          allowOrigins: ["*"],
        };
        const cors =
          url.cors === false
            ? {}
            : url.cors === true || url.cors === undefined
              ? defaultCors
              : {
                  ...defaultCors,
                  ...url.cors,
                  maxAge: url.cors.maxAge && toSeconds(url.cors.maxAge),
                };

        return { authorization, cors };
      });
    }

    function normalizeCopyFiles() {
      return output(args.copyFiles ?? []).apply((copyFiles) =>
        Promise.all(
          copyFiles.map(async (entry) => {
            const from = path.join($cli.paths.root, entry.from);
            const to = entry.to || entry.from;
            if (path.isAbsolute(to))
              throw new VisibleError(
                `Copy destination path "${to}" must be relative`,
              );

            const stats = await fs.promises.stat(from);
            const isDir = stats.isDirectory();

            return { from, to, isDir };
          }),
        ),
      );
    }

    function calculateHash() {
      return zipPath.apply(async (zipPath) => {
        const hash = crypto.createHash("sha256");
        hash.update(await fs.promises.readFile(zipPath));
        return hash.digest("hex");
      });
    }

    function buildLinkData() {
      if (!args.link) return output([]);
      return output(args.link).apply((links) => {
        const linkData = Link.build(links);
        return linkData;
      });
    }

    function buildLinkPermissions() {
      return output(args.link ?? []).apply((links) =>
        links.flatMap((l) => {
          if (!Link.AWS.isLinkable(l)) return [];
          return l.getSSTAWSPermissions();
        }),
      );
    }

    function buildHandler() {
      return all([args.bundle, dev]).apply(([bundle, dev]) => {
        if (args._ignoreCodeChanges) {
          return bundle?.startsWith($cli.paths.platform)
            ? // If bundle starts with $cli.paths.platform, it means a built-in function
              // is being used. In that case, we will use the built-in function as is.
              { bundle, handler: args.handler }
            : // If the bundle is not a built-in function, we will force it to be the empty
              // built-in function.
              {
                bundle: path.join(
                  $cli.paths.platform,
                  "functions",
                  "empty-function",
                ),
                handler: "index.handler",
              };
        }

        if (dev) {
          return {
            handler: "bootstrap",
            bundle: path.join($cli.paths.platform, "dist", "bridge"),
          };
        }

        if (args.bundle) {
          return {
            bundle: output(args.bundle),
            handler: output(args.handler),
          };
        }

        const buildResult = all([args, linkData]).apply(
          async ([args, linkData]) => {
            const result = await build(name, {
              ...args,
              links: linkData,
            });
            if (result.type === "error")
              throw new Error(result.errors.join("\n"));
            return result;
          },
        );
        return {
          handler: buildResult.handler,
          bundle: buildResult.out,
        };
      });
    }

    function buildHandlerWrapper() {
      const ret = all([
        bundle,
        handler0,
        linkData,
        streaming,
        injections,
      ]).apply(async ([bundle, handler, linkData, streaming, injections]) => {
        const hasUserInjections = injections.length > 0;
        // already injected via esbuild when bundle is undefined
        const hasLinkInjections = args.bundle && linkData.length > 0;

        if (!hasUserInjections && !hasLinkInjections) return { handler };

        const linkInjection = hasLinkInjections
          ? linkData
              .map((item) => [
                `process.env.SST_RESOURCE_${item.name} = ${JSON.stringify(
                  JSON.stringify(item.value),
                )};\n`,
              ])
              .join("")
          : "";

        const parsed = path.posix.parse(handler);
        const handlerDir = parsed.dir;
        const oldHandlerFileName = parsed.name;
        const oldHandlerFunction = parsed.ext.replace(/^\./, "");
        const newHandlerFileName = "server-index";
        const newHandlerFunction = "handler";

        // Validate handler file exists
        const newHandlerFileExt = [".js", ".mjs", ".cjs"].find((ext) =>
          fs.existsSync(
            path.join(bundle, handlerDir, oldHandlerFileName + ext),
          ),
        );
        if (!newHandlerFileExt)
          throw new VisibleError(
            `Could not find handler file "${handler}" for function "${name}"`,
          );

        return {
          handler: path.posix.join(
            handlerDir,
            `${newHandlerFileName}.${newHandlerFunction}`,
          ),
          wrapper: {
            dir: handlerDir,
            name: `${newHandlerFileName}.mjs`,
            content: streaming
              ? [
                  linkInjection,
                  `export const ${newHandlerFunction} = awslambda.streamifyResponse(async (event, context) => {`,
                  ...injections,
                  `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerFileName}${newHandlerFileExt}");`,
                  `  return rawHandler(event, context);`,
                  `});`,
                ].join("\n")
              : [
                  linkInjection,
                  `export const ${newHandlerFunction} = async (event, context) => {`,
                  ...injections,
                  `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerFileName}${newHandlerFileExt}");`,
                  `  return rawHandler(event, context);`,
                  `};`,
                ].join("\n"),
          },
        };
      });
      return {
        handler: ret.handler,
        wrapper: ret.wrapper,
      };
    }

    function createRole() {
      return all([args.permissions || [], linkPermissions, dev]).apply(
        ([argsPermissions, linkPermissions, dev]) => {
          return new aws.iam.Role(
            `${name}Role`,
            {
              assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
                Service: "lambda.amazonaws.com",
              }),
              inlinePolicies: [
                {
                  name: "inline",
                  policy: aws.iam.getPolicyDocumentOutput({
                    statements: [
                      ...argsPermissions,
                      ...linkPermissions,
                      ...(dev
                        ? [
                            {
                              actions: ["iot:*"],
                              resources: ["*"],
                            },
                          ]
                        : []),
                    ],
                  }).json,
                },
              ],
              managedPolicyArns: [
                "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
              ],
            },
            { parent },
          );
        },
      );
    }

    function zipBundleFolder() {
      // Note: cannot point the bundle to the `.open-next/server-function`
      //       b/c the folder contains node_modules. And pnpm node_modules
      //       contains symlinks. Pulumi cannot zip symlinks correctly.
      //       We will zip the folder ourselves.
      return all([bundle, wrapper, copyFiles]).apply(
        async ([bundle, wrapper, copyFiles]) => {
          const zipPath = path.resolve(
            $cli.paths.work,
            "artifacts",
            name,
            "code.zip",
          );
          await fs.promises.mkdir(path.dirname(zipPath), {
            recursive: true,
          });

          await new Promise(async (resolve, reject) => {
            const ws = fs.createWriteStream(zipPath);
            const archive = archiver("zip", {
              // Ensure deterministic zip file hashes
              // https://github.com/archiverjs/node-archiver/issues/397#issuecomment-554327338
              statConcurrency: 1,
            });
            archive.on("warning", reject);
            archive.on("error", reject);
            // archive has been finalized and the output file descriptor has closed, resolve promise
            // this has to be done before calling `finalize` since the events may fire immediately after.
            // see https://www.npmjs.com/package/archiver
            ws.once("close", () => {
              resolve(zipPath);
            });
            archive.pipe(ws);

            // set the date to 0 so that the zip file is deterministic
            archive.glob(
              "**",
              { cwd: bundle, dot: true },
              { date: new Date(0), mode: 0o777 },
            );

            // Add handler wrapper into the zip
            if (wrapper) {
              archive.append(wrapper.content, {
                name: wrapper.name,
                date: new Date(0),
              });
            }

            // Add copyFiles into the zip
            copyFiles.forEach(async (entry) => {
              // TODO
              //if ($app. mode === "deploy")
              entry.isDir
                ? archive.directory(entry.from, entry.to, { date: new Date(0) })
                : archive.file(entry.from, {
                    name: entry.to,
                    date: new Date(0),
                  });
              //if (mode === "start") {
              //  try {
              //    const dir = path.dirname(toPath);
              //    await fs.mkdir(dir, { recursive: true });
              //    await fs.symlink(fromPath, toPath);
              //  } catch (ex) {
              //    Logger.debug("Failed to symlink", fromPath, toPath, ex);
              //  }
              //}
            });
            await archive.finalize();
          });

          return zipPath;
        },
      );
    }

    function createBucketObject() {
      return new aws.s3.BucketObjectv2(
        `${name}Code`,
        {
          key: interpolate`assets/${name}-code-${bundleHash}.zip`,
          bucket: region.apply((region) =>
            bootstrap.forRegion(region).then((d) => d.asset),
          ),
          source: zipPath.apply((zipPath) => new asset.FileArchive(zipPath)),
        },
        {
          parent,
          ignoreChanges: args._ignoreCodeChanges
            ? ["key", "source"]
            : undefined,
          retainOnDelete: true,
        },
      );
    }

    function createFunction() {
      return new aws.lambda.Function(
        `${name}Function`,
        transform(args.transform?.function, {
          description: args.description,
          code: new asset.AssetArchive({
            index: new asset.StringAsset("exports.handler = () => {}"),
          }),
          handler,
          role: role.arn,
          runtime,
          timeout: timeout.apply((timeout) => toSeconds(timeout)),
          memorySize: memory.apply((memory) => toMBs(memory)),
          environment: {
            variables: environment,
          },
          architectures,
        }),
        { parent },
      );
    }

    function createLogGroup() {
      return new LogGroup(
        `${name}LogGroup`,
        {
          logGroupName: interpolate`/aws/lambda/${fn.name}`,
          retentionInDays: logging.apply(
            (logging) => RETENTION[logging.retention],
          ),
          region,
        },
        { parent },
      );
    }

    function createUrl() {
      return url.apply((url) => {
        if (url === undefined) return;

        return new aws.lambda.FunctionUrl(
          `${name}Url`,
          {
            functionName: fn.name,
            authorizationType: url.authorization.toUpperCase(),
            invokeMode: streaming.apply((streaming) =>
              streaming ? "RESPONSE_STREAM" : "BUFFERED",
            ),
            cors: url.cors,
          },
          { parent },
        );
      });
    }

    function updateFunctionCode() {
      return output([fn]).apply(
        ([fn]) =>
          new FunctionCodeUpdater(
            `${name}CodeUpdater`,
            {
              functionName: fn.name,
              s3Bucket: file.bucket,
              s3Key: file.key,
              functionLastModified: fn.lastModified,
              region,
            },
            {
              parent,
              ignoreChanges: args._ignoreCodeChanges
                ? ["s3Bucket", "s3Key"]
                : undefined,
            },
          ),
      );
    }
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The IAM Role the function will use.
       */
      role: this.role,
      /**
       * The AWS Lambda function.
       */
      function: this.function,
    };
  }

  public get url() {
    return this.fnUrl.apply((url) => url?.functionUrl ?? output(undefined));
  }

  /**
   * The ARN of the Lambda function.
   */
  public get arn() {
    return this.function.arn;
  }

  /**
   * The ARN of the Lambda function's log group.
   */
  public get logGroupArn() {
    return this.logGroup.logGroupArn;
  }

  /** @internal */
  public getSSTLink() {
    return {
      type: `{ functionName: string }`,
      value: {
        functionName: this.function.name,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["lambda:InvokeFunction"],
        resources: [this.function.arn],
      },
    ];
  }
}
