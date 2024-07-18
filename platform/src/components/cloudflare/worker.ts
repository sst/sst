import fs from "fs/promises";
import {
  ComponentResourceOptions,
  output,
  Output,
  all,
  jsonStringify,
  interpolate,
} from "@pulumi/pulumi";
import * as cf from "@pulumi/cloudflare";
import type { Loader, BuildOptions } from "esbuild";
import { build } from "../../runtime/cloudflare.js";
import { Component, Transform, transform } from "../component";
import { WorkerUrl } from "./providers/worker-url.js";
import { Link } from "../link.js";
import type { Input } from "../input.js";
import { ZoneLookup } from "./providers/zone-lookup.js";
import { iam } from "@pulumi/aws";
import { Permission } from "../aws/permission.js";
import { Binding, binding } from "./binding.js";

export interface WorkerArgs {
  /**
   * Path to the handler file for the worker.
   *
   * The handler path is relative to the root your repo or the `sst.config.ts`.
   *
   * @example
   *
   * ```js
   * {
   *   handler: "packages/functions/src/worker.ts"
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
   * Set a custom domain for your Worker. Supports domains hosted on Cloudflare.
   *
   * :::tip
   * You can migrate an externally hosted domain to Cloudflare by
   * [following this guide](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
   * :::
   *
   * @example
   *
   * ```js
   * {
   *   domain: "domain.com"
   * }
   * ```
   */
  domain?: Input<string>;
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
     * [`BuildOptions`](https://esbuild.github.io/api/#build).
     * :::
     *
     */
    esbuild?: Input<BuildOptions>;
    /**
     * Disable if the worker code should be minified when bundled.
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
   * Key-value pairs that are set as [Worker environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/).
   *
   * They can be accessed in your worker through `env.<key>`.
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
   * [Transform](/docs/components/#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the Worker resource.
     */
    worker?: Transform<cf.WorkerScriptArgs>;
  };
  /**
   * @internal
   * Placehodler for future feature.
   */
  live?: boolean;
}

/**
 * The `Worker` component lets you create a Cloudflare Worker.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts title="sst.config.ts"
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
 * ```ts {5} title="sst.config.ts"
 * const bucket = new sst.aws.Bucket("MyBucket");
 *
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   link: [bucket]
 * });
 * ```
 *
 * You can use the [SDK](/docs/reference/sdk/) to access the linked resources
 * in your handler.
 *
 * ```ts title="src/worker.ts" {3}
 * import { Resource } from "sst";
 *
 * console.log(Resource.MyBucket.name);
 * ```
 *
 * #### Enable URLs
 *
 * Enable worker URLs to invoke the worker over HTTP.
 *
 * ```ts {3} title="sst.config.ts"
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
 * ```ts title="sst.config.ts" {3-5}
 * new sst.cloudflare.Worker("MyWorker", {
 *   handler: "src/worker.handler",
 *   build: {
 *     install: ["pg"]
 *   }
 * });
 * ```
 */
export class Worker extends Component implements Link.Linkable {
  private script: Output<cf.WorkerScript>;
  private workerUrl: WorkerUrl;
  private workerDomain?: cf.WorkerDomain;

  constructor(name: string, args: WorkerArgs, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const urlEnabled = normalizeUrl();

    const bindings = buildBindings();
    const iamCredentials = createAwsCredentials();
    const handler = buildHandler();
    const script = createScript();
    const workerUrl = createWorkersUrl();
    const workerDomain = createWorkersDomain();

    this.script = script;
    this.workerUrl = workerUrl;
    this.workerDomain = workerDomain;

    this.registerOutputs({
      _receiver: {
        directory: args.handler,
        links: all([bindings]).apply(([links]) =>
          Object.values(links)
            .flat()
            .filter((l) => l.name.startsWith("SST_RESOURCE_") === false)
            .map((l) => l.name),
        ),
        environment: args.environment,
        cloudflare: {},
      },
      _live: all([name, args.handler, args.build, args.live]).apply(
        ([name, handler, build, live]) =>
          !$dev || live == false
            ? undefined
            : {
                functionID: name,
                links: [],
                handler,
                runtime: "worker",
                properties: {
                  accountID: sst.cloudflare.DEFAULT_ACCOUNT_ID,
                  scriptName: script.name,
                  build,
                },
              },
      ),
      _metadata: {
        handler: args.handler,
      },
    });

    function normalizeUrl() {
      return output(args.url).apply((v) => v ?? false);
    }

    function buildBindings() {
      const result = {
        plainTextBindings: [
          {
            name: "SST_RESOURCE_App",
            text: jsonStringify({
              name: $app.name,
              stage: $app.stage,
            }),
          },
        ],
      } as Record<Binding["type"], any[]>;
      if (!args.link) return result;
      return output(args.link).apply((links) => {
        for (let link of links) {
          if (!Link.isLinkable(link)) continue;
          const name = output(link.urn).apply((uri) => uri.split("::").at(-1)!);
          const item = link.getSSTLink();
          const b = item.include?.find(
            (i) => i.type === "cloudflare.binding",
          ) as ReturnType<typeof binding>;
          if (b) {
            if (!result[b.binding]) result[b.binding] = [];
            result[b.binding].push({
              name,
              ...b.properties,
            });
            continue;
          }
          if (!result.secretTextBindings) result.secretTextBindings = [];
          result.secretTextBindings.push({
            name,
            text: jsonStringify(item.properties),
          });
        }
        return result;
      });
    }

    function createAwsCredentials() {
      return output(
        Link.getInclude<Permission>("aws.permission", args.link),
      ).apply((permissions) => {
        if (permissions.length === 0) return;

        const user = new iam.User(
          `${name}AwsUser`,
          { forceDestroy: true },
          { parent },
        );

        new iam.UserPolicy(
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

        const keys = new iam.AccessKey(
          `${name}AwsCredentials`,
          { user: user.name },
          { parent },
        );

        return keys;
      });
    }

    function buildHandler() {
      const buildResult = all([args]).apply(async ([args]) => {
        const result = await build(name, args);
        if (result.type === "error") {
          throw new Error(result.errors.join("\n"));
        }
        return result;
      });
      return buildResult.handler;
    }

    function createScript() {
      return all([handler, args.environment, iamCredentials, bindings]).apply(
        async ([handler, environment, iamCredentials, bindings]) =>
          new cf.WorkerScript(
            `${name}Script`,
            transform(args.transform?.worker, {
              name,
              accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
              content: (await fs.readFile(handler)).toString(),
              module: true,
              compatibilityDate: "2024-04-04",
              compatibilityFlags: ["nodejs_compat"],
              ...bindings,
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
                ...(bindings.plainTextBindings || []),
              ],
              secretTextBindings: [
                ...(iamCredentials
                  ? [
                      {
                        name: "AWS_SECRET_ACCESS_KEY",
                        text: iamCredentials.secret,
                      },
                    ]
                  : []),
                ...(bindings.secretTextBindings || []),
              ],
            }),
            { parent },
          ),
      );
    }

    function createWorkersUrl() {
      return new WorkerUrl(
        `${name}Url`,
        {
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
          scriptName: script.name,
          enabled: urlEnabled,
        },
        { parent },
      );
    }

    function createWorkersDomain() {
      if (!args.domain) return;

      const zone = new ZoneLookup(
        `${name}ZoneLookup`,
        {
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
          domain: args.domain,
        },
        { parent },
      );

      return new cf.WorkerDomain(
        `${name}Domain`,
        {
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
          service: script.name,
          hostname: args.domain,
          zoneId: zone.id,
        },
        { parent },
      );
    }
  }

  /**
   * The Worker URL if `url` is enabled.
   */
  public get url() {
    return this.workerDomain
      ? interpolate`https://${this.workerDomain.hostname}`
      : this.workerUrl.url.apply((url) => (url ? `https://${url}` : url));
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

  /**
   * When you link a worker, say WorkerA, to another worker, WorkerB; it automatically creates
   * a service binding between the workers. It allows WorkerA to call WorkerB without going
   * through a publicly-accessible URL.
   *
   * @example
   * ```ts title="index.ts" {3}
   * import { Resource } from "sst";
   *
   * await Resource.WorkerB.fetch(request);
   * ```
   *
   * Read more about [binding Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).
   *
   * @internal
   */
  getSSTLink() {
    return {
      properties: {
        url: this.url,
      },
      include: [
        binding("serviceBindings", {
          service: this.script.id,
        }),
      ],
    };
  }
}

const __pulumiType = "sst:cloudflare:Worker";
// @ts-expect-error
Worker.__pulumiType = __pulumiType;
