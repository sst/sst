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
  unsecret,
} from "@pulumi/pulumi";
import { build } from "../../runtime/node.js";
import { FunctionCodeUpdater } from "./providers/function-code-updater.js";
import { bootstrap } from "./helpers/bootstrap.js";
import { Duration, DurationMinutes, toSeconds } from "../duration.js";
import { Size, toMBs } from "../size.js";
import { Component, Prettify, Transform, transform } from "../component.js";
import { Link } from "../link.js";
import { VisibleError } from "../error.js";
import type { Input } from "../input.js";
import { prefixName } from "../naming.js";
import { RETENTION } from "./logging.js";
import {
  cloudwatch,
  getCallerIdentityOutput,
  getRegionOutput,
  iam,
  lambda,
  s3,
  types,
} from "@pulumi/aws";
import { Permission, permission } from "./permission.js";

export type FunctionPermissionArgs = {
  /**
   * The [IAM actions](https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html#actions_table) that can be performed.
   * @example
   *
   * ```js
   * {
   *   actions: ["s3:*"]
   * }
   * ```
   */
  actions: string[];
  /**
   * The resourcess specified using the [IAM ARN format](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html).
   * @example
   *
   * ```js
   * {
   *   resources: ["arn:aws:s3:::my-bucket/*"]
   * }
   * ```
   */
  resources: Input<string>[];
};

interface FunctionUrlCorsArgs {
  /**
   * Allow cookies or other credentials in requests to the function URL.
   * @default `false`
   * @example
   * ```js
   * {
   *   url: {
   *     cors: {
   *       allowCredentials: true
   *     }
   *   }
   * }
   * ```
   */
  allowCredentials?: Input<boolean>;
  /**
   * The HTTP headers that origins can include in requests to the function URL.
   * @default `["*"]`
   * @example
   * ```js
   * {
   *   url: {
   *     cors: {
   *       allowHeaders: ["date", "keep-alive", "x-custom-header"]
   *     }
   *   }
   * }
   * ```
   */
  allowHeaders?: Input<Input<string>[]>;
  /**
   * The origins that can access the function URL.
   * @default `["*"]`
   * @example
   * ```js
   * {
   *   url: {
   *     cors: {
   *       allowOrigins: ["https://www.example.com", "http://localhost:60905"]
   *     }
   *   }
   * }
   * ```
   * Or the wildcard for all origins.
   * ```js
   * {
   *   url: {
   *     cors: {
   *       allowOrigins: ["*"]
   *     }
   *   }
   * }
   * ```
   */
  allowOrigins?: Input<Input<string>[]>;
  /**
   * The HTTP methods that are allowed when calling the function URL.
   * @default `["*"]`
   * @example
   * ```js
   * {
   *   url: {
   *     cors: {
   *       allowMethods: ["GET", "POST", "DELETE"]
   *     }
   *   }
   * }
   * ```
   * Or the wildcard for all methods.
   * ```js
   * {
   *   url: {
   *     cors: {
   *       allowMethods: ["*"]
   *     }
   *   }
   * }
   * ```
   */
  allowMethods?: Input<
    Input<
      "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT"
    >[]
  >;
  /**
   * The HTTP headers you want to expose in your function to an origin that calls the function URL.
   * @default `[]`
   * @example
   * ```js
   * {
   *   url: {
   *     cors: {
   *       exposeHeaders: ["date", "keep-alive", "x-custom-header"]
   *     }
   *   }
   * }
   * ```
   */
  exposeHeaders?: Input<Input<string>[]>;
  /**
   * The maximum amount of time the browser can cache results of a preflight request. By
   * default the browser doesn't cache the results. The maximum value is `86400 seconds` or `1 day`.
   * @default `"0 seconds"`
   * @example
   * ```js
   * {
   *   url: {
   *     cors: {
   *       maxAge: "1 day"
   *     }
   *   }
   * }
   * ```
   */
  maxAge?: Input<Duration>;
}

export interface FunctionArgs {
  /**
   * Disable running this function [Live](/docs/live/) in `sst dev`.
   * @default `true`
   * @example
   * ```js
   * {
   *   live: false
   * }
   * ```
   */
  live?: Input<false>;
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
   * @default `"nodejs20.x"`
   * @example
   * ```js
   * {
   *   runtime: "nodejs18.x"
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
   * Path to the handler for the function with the format `{file}.{method}`.
   *
   * :::note
   * You don't need to specify the file extension.
   * :::
   *
   * The handler path is relative to the root your repo or the `sst.config.ts`.
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
   * The maximum amount of time the function can run. The minimum timeout is 1 second and the maximum is 900 seconds or 15 minutes.
   *
   * :::note
   * If a function is connected to another service, the request will time out based on the service's limits.
   * :::
   *
   * While the maximum timeout is 15 minutes, if a function is connected to other services, it'll time out based on those limits. API Gateway for example has a timeout of 30 seconds. So even if the function has a timeout of 15 minutes, the API request will time out after 30 seconds.
   *
   * @default `"20 seconds"`
   * @example
   * ```js
   * {
   *   timeout: "900 seconds"
   * }
   * ```
   */
  timeout?: Input<DurationMinutes>;
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
   *       resources: ["arn:aws:s3:::my-bucket/*"]
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
   *       resources: ["arn:aws:s3:::my-bucket/*"]
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
   *       resources: ["*"]
   *     },
   *   ]
   * }
   * ```
   */
  permissions?: Input<Prettify<FunctionPermissionArgs>[]>;
  /**
   * [Link resources](/docs/linking/) to your function. This will:
   *
   * 1. Grant the permissions needed to access the resources.
   * 2. Allow you to access it in your site using the [SDK](/docs/reference/sdk/).
   *
   * @example
   *
   * Takes a list of components to link to the function.
   *
   * ```js
   * {
   *   link: [bucket, stripeKey]
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
   * @default `{retention: "forever"}`
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
   * Assigns the given IAM role ARN to the function. This allows you to pass in a previously created role.
   *
   * :::caution
   * When you pass in a role, the function will not update it if you add `permissions` or `link` resources.
   * :::
   *
   * By default, the function creates a new IAM role when it's created. It'll update this role if you add `permissions` or `link` resources.
   *
   * However, if you pass in a role, you'll need to update it manually if you add `permissions` or `link` resources.
   *
   * @default Creates a new role
   * @example
   * ```js
   * {
   *   role: "arn:aws:iam::123456789012:role/my-role"
   * }
   * ```
   */
  role?: Input<string>;
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
   * Configure the authorization and CORS settings for the endpoint.
   * ```js
   * {
   *   url: {
   *     authorization: "iam",
   *     cors: {
   *       allowOrigins: ['https://example.com']
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
         *     authorization: "iam"
         *   }
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
         *     cors: true
         *   }
         * }
         * ```
         * Only enable the `GET` and `POST` methods for `https://example.com`.
         * ```js
         * {
         *   url: {
         *     cors: {
         *       allowMethods: ["GET", "POST"],
         *       allowOrigins: ["https://example.com"]
         *     }
         *   }
         * }
         * ```
         */
        cors?: Input<boolean | Prettify<FunctionUrlCorsArgs>>;
      }
  >;
  /**
   * Configure how your function is bundled.
   *
   * By default, SST will bundle your function
   * code using [esbuild](https://esbuild.github.io/). This tree shakes your code to
   * only include what's used; reducing the size of your function package and improving
   * cold starts.
   */
  nodejs?: Input<{
    /**
     * Configure additional esbuild loaders for other file extensions. This is useful
     * when your code is importing non-JS files like `.png`, `.css`, etc.
     *
     * @example
     * ```js
     * {
     *   nodejs: {
     *     loader: {
     *      ".png": "file"
     *     }
     *   }
     * }
     * ```
     */
    loader?: Input<Record<string, Loader>>;
    /**
     * Dependencies that need to be excluded from the function package.
     *
     * Certain npm packages cannot be bundled using esbuild. This allows you to exclude them
     * from the bundle. Instead they'll be moved into a `node_modules/` directory in the
     * function package.
     *
     * :::tip
     * If esbuild is giving you an error about a package, try adding it to the `install` list.
     * :::
     *
     * This will allow your functions to be able to use these dependencies when deployed. They
     * just won't be tree shaken. You however still need to have them in your `package.json`.
     *
     * :::caution
     * Packages listed here still need to be in your `package.json`.
     * :::
     *
     * Esbuild will ignore them while traversing the imports in your code. So these are the
     * **package names as seen in the imports**. It also works on packages that are not directly
     * imported by your code.
     *
     * @example
     * ```js
     * {
     *   nodejs: {
     *     install: ["pg"]
     *   }
     * }
     * ```
     */
    install?: Input<string[]>;
    /**
     * Use this to insert a string at the beginning of the generated JS file.
     *
     * @example
     * ```js
     * {
     *   nodejs: {
     *     banner: "console.log('Function starting')"
     *   }
     * }
     * ```
     */
    banner?: Input<string>;
    /**
     * This allows you to customize esbuild config that is used.
     *
     * :::tip
     * Check out the _JS tab_ in the code snippets in the esbuild docs for the
     * [`BuildOptions`](https://esbuild.github.io/api/#build).
     * :::
     *
     */
    esbuild?: Input<BuildOptions>;
    /**
     * Disable if the function code is minified when bundled.
     *
     * @default `true`
     *
     * @example
     * ```js
     * {
     *   nodejs: {
     *     minify: false
     *   }
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
     * {
     *   nodejs: {
     *     format: "cjs"
     *   }
     * }
     * ```
     */
    format?: Input<"cjs" | "esm">;
    /**
     * Configure if source maps are added to the function bundle when **deployed**. Since they
     * increase payload size and potentially cold starts, they are not added by default.
     * However, they are always generated during `sst dev`.
     *
     * :::tip[SST Console]
     * For the [Console](/docs/console/), source maps are always generated and uploaded
     * to your bootstrap bucket. These are then downloaded and used to display
     * Issues in the console.
     * :::
     *
     * @default `false`
     *
     * @example
     * ```js
     * {
     *   nodejs: {
     *     sourcemap: true
     *   }
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
     * {
     *   nodejs: {
     *     splitting: true
     *   }
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
   * A list of Lambda layer ARNs to add to the function.
   *
   * @example
   * ```js
   * {
   *   layers: ["arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1"]
   * }
   * ```
   */
  layers?: Input<Input<string>[]>;
  /**
   * Configure the function to connect to private subnets in a virtual private cloud or VPC. This allows your function to access private resources.
   *
   * @example
   * ```js
   * {
   *   vpc: {
   *     securityGroups: ["sg-0399348378a4c256c"],
   *     subnets: ["subnet-0b6a2b73896dc8c4c", "subnet-021389ebee680c2f0"]
   *   }
   * }
   * ```
   */
  vpc?: Input<{
    /**
     * A list of VPC security group IDs.
     */
    securityGroups: Input<Input<string>[]>;
    /**
     * A list of VPC subnet IDs.
     */
    subnets: Input<Input<string>[]>;
  }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Lambda Function resource.
     */
    function?: Transform<lambda.FunctionArgs>;
    /**
     * Transform the IAM Role resource.
     */
    role?: Transform<iam.RoleArgs>;
    /**
     * Transform the CloudWatch LogGroup resource.
     */
    logGroup?: Transform<cloudwatch.LogGroupArgs>;
  };
  /**
   * @internal
   */
  _skipMetadata?: boolean;
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
 * ```ts title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler"
 * });
 * ```
 *
 * #### Set additional config
 *
 * Pass in additional Lambda config.
 *
 * ```ts {3,4} title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   timeout: "3 minutes",
 *   memory: "1024 MB"
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to the function. This will grant permissions
 * to the resources and allow you to access it in your handler.
 *
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your handler.
 *
 * ```ts title="src/lambda.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Set environment variables
 *
 * Set environment variables for the function. Available in your handler as `process.env`.
 *
 * ```ts {4} title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   environment: {
 *     DEBUG: "true"
 *   }
 * });
 * ```
 *
 * #### Enable function URLs
 *
 * Enable function URLs to invoke the function over HTTP.
 *
 * ```ts {3} title="sst.config.ts"
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   url: true
 * });
 * ```
 *
 * #### Bundling
 *
 * Customize how SST uses [esbuild](https://esbuild.github.io/) to bundle your function code
 * with the `nodejs` property.
 *
 * ```ts title="sst.config.ts" {3-5}
 * new sst.aws.Function("MyFunction", {
 *   handler: "src/lambda.handler",
 *   nodejs: {
 *     install: ["pg"]
 *   }
 * });
 * ```
 *
 * Or override it entirely by passing in your own function `bundle`.
 *
 */
export class Function extends Component implements Link.Linkable {
  private function: Output<lambda.Function>;
  private role?: iam.Role;
  private logGroup: cloudwatch.LogGroup;
  private fnUrl: Output<lambda.FunctionUrl | undefined>;
  private missingSourcemap?: boolean;

  constructor(
    name: string,
    args: FunctionArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType, name, args, opts);

    const parent = this;
    const dev = output(args.live).apply((v) => $dev && v !== false);
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
    const logGroup = createLogGroup();
    const fn = createFunction();
    const codeUpdater = updateFunctionCode();

    const fnUrl = createUrl();

    const links = linkData.apply((input) => input.map((item) => item.name));

    this.function = codeUpdater.version.apply(() => fn);
    this.role = role;
    this.logGroup = logGroup;
    this.fnUrl = fnUrl;

    this.registerOutputs({
      _live: unsecret(
        all([dev]).apply(([dev]) => {
          if (!dev) return undefined;
          return all([
            name,
            links,
            args.handler,
            args.bundle,
            args.runtime,
            args.nodejs,
            copyFiles,
          ]).apply(
            ([name, links, handler, bundle, runtime, nodejs, copyFiles]) => {
              return {
                functionID: name,
                links,
                handler: handler,
                bundle: bundle,
                runtime: runtime || "nodejs20.x",
                copyFiles,
                properties: nodejs,
              };
            },
          );
        }),
      ),
      _metadata: {
        handler: args.handler,
        internal: args._skipMetadata,
      },
    });

    function normalizeRegion() {
      return getRegionOutput(undefined, { provider: opts?.provider }).name;
    }

    function normalizeInjections() {
      return output(args.injections).apply((injections) => injections ?? []);
    }

    function normalizeRuntime() {
      return all([args.runtime]).apply(([v]) => v ?? "nodejs20.x");
    }

    function normalizeTimeout() {
      return output(args.timeout).apply((timeout) => timeout ?? "20 seconds");
    }

    function normalizeMemory() {
      return output(args.memory).apply((memory) => memory ?? "1024 MB");
    }

    function normalizeArchitectures() {
      return all([args.architecture]).apply(([arc]) =>
        arc === "arm64" ? ["arm64"] : ["x86_64"],
      );
    }

    function normalizeEnvironment() {
      return all([args.environment, dev, args.link]).apply(
        ([environment, dev]) => {
          const result = environment ?? {};
          result.SST_RESOURCE_App = JSON.stringify({
            name: $app.name,
            stage: $app.stage,
          });
          if (dev) {
            result.SST_FUNCTION_ID = name;
            result.SST_APP = $app.name;
            result.SST_STAGE = $app.stage;
            // result.SST_LINK = (link || []).map((l) => l.urn).join(",");
          }
          return result;
        },
      );
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
        const defaultCors: types.input.lambda.FunctionUrlCors = {
          allowHeaders: ["*"],
          allowMethods: ["*"],
          allowOrigins: ["*"],
        };
        const cors =
          url.cors === false
            ? undefined
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
      return output(args.link || []).apply((links) => Link.build(links));
    }

    function buildLinkPermissions() {
      return Link.getInclude<Permission>("aws.permission", args.link);
    }

    function buildHandler() {
      return dev.apply((dev) => {
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
            if (result.type === "error") {
              throw new Error(
                "Failed to build function: " + result.errors.join("\n").trim(),
              );
            }
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
        dev,
        bundle,
        handler0,
        linkData,
        streaming,
        injections,
      ]).apply(
        async ([dev, bundle, handler, linkData, streaming, injections]) => {
          if (dev) return { handler };

          const hasUserInjections = injections.length > 0;
          // already injected via esbuild when bundle is undefined
          const hasLinkInjections = args.bundle && linkData.length > 0;

          if (!hasUserInjections && !hasLinkInjections) return { handler };

          const linkInjection = hasLinkInjections
            ? linkData
                .map((item) => [
                  `process.env.SST_RESOURCE_${item.name} = ${JSON.stringify(
                    JSON.stringify(item.properties),
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
              name: path.posix.join(handlerDir, `${newHandlerFileName}.mjs`),
              content: streaming
                ? [
                    linkInjection,
                    `export const ${newHandlerFunction} = awslambda.streamifyResponse(async (event, responseStream, context) => {`,
                    ...injections,
                    `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerFileName}${newHandlerFileExt}");`,
                    `  return rawHandler(event, responseStream, context);`,
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
        },
      );
      return {
        handler: ret.handler,
        wrapper: ret.wrapper,
      };
    }

    function createRole() {
      if (args.role) return;

      const policy = all([args.permissions || [], linkPermissions, dev]).apply(
        ([argsPermissions, linkPermissions, dev]) =>
          iam.getPolicyDocumentOutput({
            statements: [
              ...argsPermissions,
              ...linkPermissions.map((item) => ({
                actions: item.actions,
                resources: item.resources,
              })),
              ...(dev
                ? [
                    {
                      actions: ["iot:*"],
                      resources: ["*"],
                    },
                  ]
                : []),
            ],
          }),
      );

      return new iam.Role(
        `${name}Role`,
        transform(args.transform?.role, {
          assumeRolePolicy: !$dev
            ? iam.assumeRolePolicyForPrincipal({
                Service: "lambda.amazonaws.com",
              })
            : iam.getPolicyDocumentOutput({
                statements: [
                  {
                    actions: ["sts:AssumeRole"],
                    principals: [
                      {
                        type: "Service",
                        identifiers: ["lambda.amazonaws.com"],
                      },
                      {
                        type: "AWS",
                        identifiers: [
                          interpolate`arn:aws:iam::${
                            getCallerIdentityOutput().accountId
                          }:root`,
                        ],
                      },
                    ],
                  },
                ],
              }).json,
          // if there are no statements, do not add an inline policy.
          // adding an inline policy with no statements will cause an error.
          inlinePolicies: policy.apply(({ statements }) =>
            statements ? [{ name: "inline", policy: policy.json }] : [],
          ),
          managedPolicyArns: [
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ...(args.vpc
              ? [
                  "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
                ]
              : []),
          ],
        }),
        { parent },
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
      return new s3.BucketObjectv2(
        `${name}Code`,
        {
          key: interpolate`assets/${name}-code-${bundleHash}.zip`,
          bucket: region.apply((region) =>
            bootstrap.forRegion(region).then((d) => d.bucket),
          ),
          source: zipPath.apply((zipPath) => new asset.FileArchive(zipPath)),
        },
        {
          parent,
          retainOnDelete: true,
        },
      );
    }

    function createLogGroup() {
      return new cloudwatch.LogGroup(
        `${name}LogGroup`,
        transform(args.transform?.logGroup, {
          name: `/aws/lambda/${prefixName(64, `${name}Function`)}`,
          retentionInDays: logging.apply(
            (logging) => RETENTION[logging.retention],
          ),
        }),
        { parent },
      );
    }

    function createFunction() {
      const transformed = transform(args.transform?.function, {
        description: all([args.description, dev]).apply(([description, dev]) =>
          dev
            ? description
              ? `${description.substring(0, 240)} (live)`
              : "live"
            : `${description ?? ""}`,
        ),
        code: new asset.FileArchive(
          path.join($cli.paths.platform, "functions", "empty-function"),
        ),
        handler: unsecret(handler),
        role: args.role ?? role!.arn,
        runtime,
        timeout: timeout.apply((timeout) => toSeconds(timeout)),
        memorySize: memory.apply((memory) => toMBs(memory)),
        environment: {
          variables: environment,
        },
        architectures,
        loggingConfig: {
          logFormat: "Text",
          logGroup: logGroup.name,
        },
        vpcConfig: args.vpc && {
          securityGroupIds: output(args.vpc).securityGroups,
          subnetIds: output(args.vpc).subnets,
        },
        layers: args.layers,
      });
      transformed.runtime = all([transformed.runtime, dev]).apply(
        ([runtime, dev]) => (dev ? "provided.al2023" : runtime!),
      );
      transformed.architectures = all([transformed.architectures, dev]).apply(
        ([architectures, dev]) => (dev ? ["x86_64"] : architectures!),
      );
      return new lambda.Function(`${name}Function`, transformed, { parent });
    }

    function createUrl() {
      return url.apply((url) => {
        if (url === undefined) return;

        return new lambda.FunctionUrl(
          `${name}Url`,
          {
            functionName: fn.name,
            authorizationType: url.authorization === "iam" ? "AWS_IAM" : "NONE",
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
      return new FunctionCodeUpdater(
        `${name}CodeUpdater`,
        {
          functionName: fn.name,
          s3Bucket: file.bucket,
          s3Key: file.key,
          functionLastModified: fn.lastModified,
          region,
        },
        { parent },
      );
    }
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    const self = this;
    return {
      /**
       * The IAM Role the function will use.
       */
      get role() {
        if (!self.role)
          throw new Error(
            `"nodes.role" is not available when a pre-existing role is used.`,
          );
        return self.role;
      },
      /**
       * The AWS Lambda function.
       */
      function: this.function,
      /**
       * The CloudWatch Log Group the function logs are stored.
       */
      logGroup: this.logGroup,
    };
  }

  /**
   * The Lambda function URL if `url` is enabled.
   */
  public get url() {
    return this.fnUrl.apply((url) => {
      if (!url)
        throw new Error(
          `Function URL is not enabled. Enable it with "url: true".`,
        );
      return url.functionUrl;
    });
  }

  /**
   * The name of the Lambda function.
   */
  public get name() {
    return this.function.name;
  }

  /**
   * The ARN of the Lambda function.
   */
  public get arn() {
    return this.function.arn;
  }

  /** @internal */
  static fromDefinition(
    name: string,
    definition: Input<string | FunctionArgs>,
    override: Pick<FunctionArgs, "description" | "permissions">,
    argsTransform?: Transform<FunctionArgs>,
    opts?: ComponentResourceOptions,
  ) {
    return output(definition).apply((definition) => {
      if (typeof definition === "string") {
        return new Function(
          name,
          transform(argsTransform, { handler: definition, ...override }),
          opts,
        );
      } else if (definition.handler) {
        return new Function(
          name,
          transform(argsTransform, {
            ...definition,
            ...override,
            permissions: all([
              definition.permissions,
              override?.permissions,
            ]).apply(([permissions, overridePermissions]) => [
              ...(permissions ?? []),
              ...(overridePermissions ?? []),
            ]),
          }),
          opts,
        );
      }
      throw new Error(`Invalid function definition for the "${name}" Function`);
    });
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        name: this.name,
        url: this.fnUrl.apply((url) => url?.functionUrl ?? output(undefined)),
      },
      include: [
        permission({
          actions: ["lambda:InvokeFunction"],
          resources: [this.function.arn],
        }),
      ],
    };
  }
}

const __pulumiType = "sst:aws:Function";
// @ts-expect-error
Function.__pulumiType = __pulumiType;
