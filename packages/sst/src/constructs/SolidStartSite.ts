import path from "path";
import { Architecture, Function as CdkFunction } from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";

/**
 * The `SolidStartSite` construct is a higher level CDK construct that makes it easy to create a SolidStart app.
 * @example
 * Deploys a SolidStart app in the `my-solid-start-app` directory.
 *
 * ```js
 * new SolidStartSite(stack, "web", {
 *   path: "my-solid-start-app/",
 * });
 * ```
 */
export class SolidStartSite extends SsrSite {
  protected initBuildConfig() {
    return {
      typesPath: ".",
      serverBuildOutputFile: "dist/server/index.mjs",
      clientBuildOutputDir: "dist/client",
      clientBuildVersionedSubDir: "assets",
    };
  }

  protected createFunctionForRegional(): CdkFunction {
    const {
      runtime,
      timeout,
      memorySize,
      bind,
      nodejs,
      permissions,
      environment,
      cdk,
    } = this.props;

    const ssrFn = new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for Solid",
      handler: path.join(this.props.path, "dist", "server", "index.handler"),
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
      handler: path.join(this.props.path, "dist", "server", "index.handler"),
      runtime,
      timeout,
      memorySize,
      bind,
      permissions,
      environment,
      nodejs: {
        format: "esm",
        ...nodejs,
      },
    });
  }
}
