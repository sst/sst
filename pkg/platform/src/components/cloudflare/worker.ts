import fs from "fs/promises";
import {
  ComponentResourceOptions,
  output,
  Output,
  all,
  jsonStringify,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as cf from "@pulumi/cloudflare";
import type { Loader, BuildOptions } from "esbuild";
import { build } from "../../runtime/cloudflare.js";
import { Component, Prettify, Transform, transform } from "../component";
import { WorkersUrl } from "./providers/workers-url.js";
import { Link } from "../link.js";
import type { Input } from "../input.js";

/**
 * @internal
 */
export interface WorkerDomainArgs {
  /**
   * The domain to use for the worker.
   */
  hostname: Input<string>;
  /**
   * The zone id for the domain.
   */
  zoneId: Input<string>;
}

export interface WorkerArgs {
  /**
   * Path to the handler for the worker with the format `{file}.{method}`.
   *
   * :::note
   * You don't need to specify the file extension.
   * :::
   *
   * The handler path is relative to the root your repo or the `sst.config.ts`.
   *
   * @example
   *
   * Here there is a file called `worker.js` (or `.ts`) in the `packages/functions/src/`
   * directory with an exported method called `handler`.
   *
   * ```js
   * {
   *   handler: "packages/functions/src/worker.handler"
   * }
   * ```
   */
  handler: Input<string>;
  /**
   * Enable a dedicated endpoint for your Worker.
   * @default `false`
   */
  url?: Input<boolean>;
  /**
   * @internal
   */
  domain?: Input<Prettify<WorkerDomainArgs>>;
  /**
   * Configure how your function is bundled.
   *
   * SST bundles your worker code using [esbuild](https://esbuild.github.io/). This tree shakes your code to only include what's used.
   */
  build?: Input<{
    /**
     * Configure additional esbuild loaders for other file extensions. This is useful
     * when your code is importing non-JS files like `.png`, `.css`, etc.
     *
     * @example
     * ```js
     * {
     *   build: {
     *     loader: {
     *      ".png": "file"
     *     }
     *   }
     * }
     * ```
     */
    loader?: Input<Record<string, Loader>>;
    /**
     * Use this to insert a string at the beginning of the generated JS file.
     *
     * @example
     * ```js
     * {
     *   build: {
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
     * [build options](https://esbuild.github.io/api/#build).
     * :::
     *
     */
    esbuild?: Input<BuildOptions>;
    /**
     * Enable or disable if the worked code is minified when bundled.
     *
     * @default `true`
     *
     * @example
     * ```js
     * {
     *   build: {
     *     minify: false
     *   }
     * }
     * ```
     */
    minify?: Input<boolean>;
  }>;
  /**
   * [Link resources](/docs/linking/) to your worker. This will:
   *
   * 1. Handle the credentials needed to access the resources.
   * 2. Allow you to access it in your site using the [Node client](/docs/reference/client/).
   *
   * @example
   *
   * Takes a list of components to link to the function.
   *
   * ```js
   * {
   *   link: [myBucket, stripeKey]
   * }
   * ```
   */
  link?: Input<any[]>;
  /**
   * Key-value pairs of values that are set as [Worker environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/).
   *
   * They can be accessed in your function using `env.<key>`.
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
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Worker resource.
     */
    worker?: Transform<cf.WorkerScriptArgs>;
  };
}

/**
 * The `Worker` component lets you create a Cloudflare Worker.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler"
 * });
 * ```
 *
 * #### Link resources
 *
 * [Link resources](/docs/linking/) to the Worker. This will handle the credentials
 * and allow you to access it in your handler.
 *
 * ```ts {5}
 * const myBucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   link: [myBucket]
 * });
 * ```
 *
 * You can use the [Node client](/docs/reference/client/) to access the linked resources
 * in your handler.
 *
 * ```ts title="src/worker.ts"
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Enable URLs
 *
 * Enable worker URLs to invoke the worker over HTTP.
 *
 * ```ts {3}
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   url: true
 * });
 * ```
 *
 * #### Bundling
 *
 * Customize how SST uses [esbuild](https://esbuild.github.io/) to bundle your worker code with the `build` property.
 *
 * ```ts
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   build: {
 *     install: ["pg"]
 *   }
 * });
 * ```
 */
export class Worker extends Component {
  private script: Output<cf.WorkerScript>;
  private workersUrl: WorkersUrl;

  constructor(name: string, args: WorkerArgs, opts?: ComponentResourceOptions) {
    super("sst:cloudflare:Worker", name, args, opts);

    const parent = this;

    const urlEnabled = normalizeUrl();

    const linkData = buildLinkData();
    const iamCredentials = createAwsCredentials();
    const handler = buildHandler();
    const script = createScript();
    const workersUrl = createWorkersUrl();
    createWorkersDomain();

    this.script = script;
    this.workersUrl = workersUrl;

    function normalizeUrl() {
      return output(args.url).apply((v) => v ?? false);
    }

    function buildLinkData() {
      if (!args.link) return [];
      return output(args.link).apply((links) => {
        const linkData = Link.build(links);
        return linkData;
      });
    }

    function createAwsCredentials() {
      return output(args.link ?? []).apply((links) => {
        const permissions = links.flatMap((l) => {
          if (!Link.AWS.isLinkable(l)) return [];
          return l.getSSTAWSPermissions();
        });

        if (permissions.length === 0) return;

        const user = new aws.iam.User(
          `${name}AwsUser`,
          { forceDestroy: true },
          { parent },
        );

        new aws.iam.UserPolicy(
          `${name}AwsPolicy`,
          {
            user: user.name,
            policy: jsonStringify({
              Statement: permissions.map((p) => ({
                Effect: "Allow",
                Action: p.actions,
                Resource: p.resources,
              })),
            }),
          },
          { parent },
        );

        const keys = new aws.iam.AccessKey(
          `${name}AwsCredentials`,
          { user: user.name },
          { parent },
        );

        return keys;
      });
    }

    function buildHandler() {
      const buildResult = all([args, linkData]).apply(
        async ([args, linkData]) => {
          const result = await build(name, { ...args, links: linkData });
          if (result.type === "error") {
            throw new Error(result.errors.join("\n"));
          }
          return result;
        },
      );
      return buildResult.handler;
    }

    function createScript() {
      return all([handler, args.environment, iamCredentials]).apply(
        async ([handler, environment, iamCredentials]) =>
          new cf.WorkerScript(
            `${name}Script`,
            transform(args.transform?.worker, {
              name,
              accountId: $app.providers?.cloudflare?.accountId!,
              content: (await fs.readFile(handler)).toString(),
              module: true,
              compatibilityDate: "2024-01-01",
              compatibilityFlags: ["nodejs_compat"],
              plainTextBindings: [
                ...(iamCredentials
                  ? [
                      {
                        name: "AWS_ACCESS_KEY_ID",
                        text: iamCredentials.id,
                      },
                    ]
                  : []),
                ...Object.entries(environment ?? {}).map(([key, value]) => ({
                  name: key,
                  text: value,
                })),
              ],
              secretTextBindings: iamCredentials
                ? [
                    {
                      name: "AWS_SECRET_ACCESS_KEY",
                      text: iamCredentials.secret,
                    },
                  ]
                : [],
            }),
            { parent },
          ),
      );
    }

    function createWorkersUrl() {
      return new WorkersUrl(
        `${name}Url`,
        {
          accountId: $app.providers?.cloudflare?.accountId!,
          scriptName: script.name,
          enabled: urlEnabled,
        },
        { parent },
      );
    }

    function createWorkersDomain() {
      if (!args.domain) return;

      return new cf.WorkerDomain(
        `${name}Domain`,
        {
          accountId: $app.providers?.cloudflare?.accountId!,
          service: script.name,
          hostname: output(args.domain).apply((domain) => domain.hostname),
          zoneId: output(args.domain).apply((domain) => domain.zoneId),
        },
        { parent },
      );
    }
  }

  /**
   * The Worker URL if `url` is enabled.
   */
  public get url() {
    return this.workersUrl.url.apply((url) => (url ? `https://${url}` : url));
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Cloudflare Worker script.
       */
      worker: this.script,
    };
  }
}
