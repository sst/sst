import fs from "fs";
import path from "path";
import { Architecture, Function as CdkFunction } from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";

/**
 * The `SvelteKitSite` construct is a higher level CDK construct that makes it easy to create a SvelteKit app.
 * @example
 * Deploys a SvelteKit app in the `my-svelte-app` directory.
 *
 * ```js
 * new SvelteKitSite(stack, "web", {
 *   path: "my-svelte-app/",
 * });
 * ```
 */
export class SvelteKitSite extends SsrSite {
  protected initBuildConfig() {
    return {
      typesPath: "src",
      serverBuildOutputFile:
        ".svelte-kit/svelte-kit-sst/server/lambda-handler/index.js",
      // Note: form action requests contain "/" in request query string
      //       ie. POST request with query string "?/action"
      //       CloudFront does not allow query string with "/". It needs to be encoded.
      serverCFFunctionInjection: `
        for (var key in request.querystring) {
          if (key.includes("/")) {
            request.querystring[encodeURIComponent(key)] = request.querystring[key];
            delete request.querystring[key];
          }
        }
      `,
      clientBuildOutputDir: ".svelte-kit/svelte-kit-sst/client",
      clientBuildVersionedSubDir: "_app",
      prerenderedBuildOutputDir: ".svelte-kit/svelte-kit-sst/prerendered",
    };
  }

  protected createFunctionForRegional(): CdkFunction {
    const {
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      nodejs,
      bind,
      cdk,
    } = this.props;

    const ssrFn = new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for SvelteKit",
      handler: path.join(
        this.props.path,
        ".svelte-kit",
        "svelte-kit-sst",
        "server",
        "lambda-handler",
        "index.handler"
      ),
      runtime,
      memorySize,
      timeout,
      bind,
      environment,
      permissions,
      nodejs: {
        format: "esm",
        ...nodejs,
        esbuild: {
          minify: process.env.SST_DEBUG ? false : true,
          sourcemap: process.env.SST_DEBUG ? "inline" : false,
          define: {
            "process.env.SST_DEBUG": process.env.SST_DEBUG ? "true" : "false",
          },
          ...nodejs?.esbuild,
        },
      },
      copyFiles: [
        {
          from: path.join(
            this.props.path,
            ".svelte-kit",
            "svelte-kit-sst",
            "prerendered"
          ),
          to: "prerendered",
        },
      ],
      ...cdk?.server,
    });

    return ssrFn.function;
  }

  protected createFunctionForEdge(): EdgeFunction {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      nodejs,
    } = this.props;

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      handler: path.join(
        this.props.path,
        ".svelte-kit",
        "svelte-kit-sst",
        "server",
        "lambda-handler",
        "index.handler"
      ),
      runtime,
      timeout,
      memorySize,
      bind,
      environment,
      permissions,
      nodejs: {
        format: "esm",
        ...nodejs,
        esbuild: {
          minify: process.env.SST_DEBUG ? false : true,
          sourcemap: process.env.SST_DEBUG ? "inline" : false,
          define: {
            "process.env.SST_DEBUG": process.env.SST_DEBUG ? "true" : "false",
          },
          ...nodejs?.esbuild,
        },
      },
    });
  }

  protected generateBuildId(): string {
    const filePath = path.join(
      this.props.path,
      ".svelte-kit/svelte-kit-sst/client/_app/version.json"
    );
    const content = fs.readFileSync(filePath).toString();
    return JSON.parse(content).version;
  }
}
