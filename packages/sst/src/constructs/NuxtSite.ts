import fs from "fs";
import path from "path";
import { Function as CdkFunction } from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";
/**
 * The `NuxtSite` construct is a higher level CDK construct that makes it easy to create a Nuxt app.
 * @example
 * Deploys a Nuxt app in the `my-nuxt-app` directory.
 *
 * ```js
 * new NuxtSite(stack, "web", {
 *   path: "my-Nuxt-app/",
 * });
 * ```
 */
export class NuxtSite extends SsrSite {
  protected initBuildConfig() {
    return {
        typesPath: "./",
        serverBuildOutputFile: ".output/server/index.mjs",
        clientBuildOutputDir: ".output/public",
        clientBuildVersionedSubDir: "_nuxt",
    };
  }

  protected validateBuildOutput() {
    const serverDir = path.join(this.props.path, ".output/server");
    const clientDir = path.join(this.props.path, ".output/public");
    if (!fs.existsSync(serverDir) || !fs.existsSync(clientDir)) {
        throw new Error(`Build output inside ".output/" does not contain the "server" and "public" folders. Make sure Server-side Rendering (SSR) is enabled in your Nuxt app. If you are looking to deploy the Nuxt app as a static site, please use the StaticSite construct — https://docs.sst.dev/constructs/StaticSite`);
    }

    super.validateBuildOutput();
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
      description: "Server handler for Nuxt",
      handler: path.join(this.props.path, ".output", "server", "index.handler"),
      runtime,
      memorySize,
      timeout,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
      bind,
      environment,
      permissions,
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
      handler: path.join(this.props.path, ".output", "server", "index.handler"),
      runtime,
      timeout,
      memorySize,
      bind,
      environment,
      permissions,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
    });
  }
}
