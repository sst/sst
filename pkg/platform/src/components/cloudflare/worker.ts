import fs from "fs/promises";
import {
  ComponentResourceOptions,
  output,
  Output,
  all,
  jsonStringify,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { WorkerScript } from "@pulumi/cloudflare";
import type { Loader, BuildOptions } from "esbuild";
import { build } from "../../runtime/cloudflare.js";
import { Component } from "../component";
import { WorkersDevUrl } from "./providers/workers-dev-url";
import { Link } from "../link.js";
import type { Input } from "../input.js";

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
  devUrl?: Input<boolean>;
  /**
   * Configure how your function is bundled.
   *
   * SST bundles your worker code using [esbuild](https://esbuild.github.io/). This tree shakes your code to only include what's used.
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
     *   nodejs: {
     *     minify: false
     *   }
     * }
     * ```
     */
    minify?: Input<boolean>;
    sourcemap?: Input<boolean>;
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
 * By default, SST will bundle your worker code using [esbuild](https://esbuild.github.io/).
 *  You can customize this using the `build` property.
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
  private script: Output<WorkerScript>;
  private workersDevUrl: WorkersDevUrl;

  constructor(name: string, args: WorkerArgs, opts?: ComponentResourceOptions) {
    super("sst:cloudflare:Worker", name, args, opts);

    const parent = this;

    const devUrlEnabled = normalizeDevUrl();

    const linkData = buildLinkData();
    const iamCredentials = createAwsCredentials();
    const handler = buildHandler();
    const script = createScript();
    const workersDevUrl = createWorkersDevUrl();

    this.script = script;
    this.workersDevUrl = workersDevUrl;

    function normalizeDevUrl() {
      return output(args.devUrl).apply((v) => v ?? false);
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
      return all([handler, iamCredentials]).apply(
        async ([handler, iamCredentials]) =>
          new WorkerScript(
            `${name}Script`,
            {
              name,
              accountId: $app.providers?.cloudflare?.accountId!,
              content: (await fs.readFile(handler)).toString(),
              module: true,
              compatibilityDate: "2024-01-01",
              compatibilityFlags: ["nodejs_compat"],
              plainTextBindings: iamCredentials
                ? [
                    {
                      name: "AWS_ACCESS_KEY_ID",
                      text: iamCredentials.id,
                    },
                  ]
                : [],
              secretTextBindings: iamCredentials
                ? [
                    {
                      name: "AWS_SECRET_ACCESS_KEY",
                      text: iamCredentials.secret,
                    },
                  ]
                : [],
            },
            { parent },
          ),
      );
    }

    function createWorkersDevUrl() {
      return new WorkersDevUrl(
        `${name}DevUrl`,
        {
          accountId: $app.providers?.cloudflare?.accountId!,
          scriptName: script.name,
          enabled: devUrlEnabled,
        },
        { parent },
      );
    }
  }

  /**
   * The Worker URL if `url` is enabled.
   */
  public get devUrl() {
    return this.workersDevUrl.url.apply((url) =>
      url ? `https://${url}` : url,
    );
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
