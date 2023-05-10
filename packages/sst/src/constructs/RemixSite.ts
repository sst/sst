import fs from "fs";
import url from "url";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { Function as CdkFunction } from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type RemixConfig = {
  assetsBuildDirectory: string;
  publicPath: string;
  serverBuildPath: string;
  serverModuleFormat: string;
  serverPlatform: string;
  server?: string;
};

/**
 * The `RemixSite` construct is a higher level CDK construct that makes it easy to create a Remix app.
 *
 * @example
 *
 * Deploys a Remix app in the `my-remix-app` directory.
 *
 * ```js
 * new RemixSite(stack, "web", {
 *   path: "my-remix-app/",
 * });
 * ```
 */
export class RemixSite extends SsrSite {
  protected initBuildConfig() {
    const { path: sitePath } = this.props;

    const configDefaults: RemixConfig = {
      assetsBuildDirectory: "public/build",
      publicPath: "/build/",
      serverBuildPath: "build/index.js",
      serverModuleFormat: "cjs",
      serverPlatform: "node",
    };

    // Validate config path
    const configPath = path.resolve(sitePath, "remix.config.js");
    if (!fs.existsSync(configPath)) {
      throw new Error(
        `Could not find "remix.config.js" at expected path "${configPath}".`
      );
    }

    // Load config
    const userConfig = require(configPath);
    const config: RemixConfig = {
      ...configDefaults,
      ...userConfig,
    };

    // Validate config
    Object.keys(configDefaults).forEach((key) => {
      const k = key as keyof RemixConfig;
      if (config[k] !== configDefaults[k]) {
        throw new Error(
          `RemixSite: remix.config.js "${key}" must be "${configDefaults[k]}".`
        );
      }
    });

    return {
      typesPath: ".",
      serverBuildOutputFile: "build/index.js",
      clientBuildOutputDir: "public",
      clientBuildVersionedSubDir: "build",
    };
  }

  private createServerLambdaBundle(wrapperFile: string) {
    // Create a Lambda@Edge handler for the Remix server bundle.
    //
    // Note: Remix does perform their own internal ESBuild process, but it
    // doesn't bundle 3rd party dependencies by default. In the interest of
    // keeping deployments seamless for users we will create a server bundle
    // with all dependencies included. We will still need to consider how to
    // address any need for external dependencies, although I think we should
    // possibly consider this at a later date.

    // In this path we are assuming that the Remix build only outputs the
    // "core server build". We can safely assume this as we have guarded the
    // remix.config.js to ensure it matches our expectations for the build
    // configuration.
    // We need to ensure that the "core server build" is wrapped with an
    // appropriate Lambda@Edge handler. We will utilise an internal asset
    // template to create this wrapper within the "core server build" output
    // directory.

    // Copy the server lambda handler
    const handler = path.join(this.props.path, "build", "server.js");
    fs.copyFileSync(
      path.resolve(__dirname, `../support/remix-site-function/${wrapperFile}`),
      handler
    );

    // Copy the Remix polyfil to the server build directory
    //
    // Note: We need to ensure that the polyfills are injected above other code that
    // will depend on them. Importing them within the top of the lambda code
    // doesn't appear to guarantee this, we therefore leverage ESBUild's
    // `inject` option to ensure that the polyfills are injected at the top of
    // the bundle.
    const polyfillDest = path.join(this.props.path, "build/polyfill.js");
    fs.copyFileSync(
      path.resolve(__dirname, "../support/remix-site-function/polyfill.js"),
      polyfillDest
    );

    return {
      handler: path.join(this.props.path, "build", "server.handler"),
      esbuild: { inject: [polyfillDest] },
    };
  }

  protected createFunctionForRegional(): CdkFunction {
    const {
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      bind,
      nodejs,
      cdk,
    } = this.props;

    const { handler, esbuild } =
      this.createServerLambdaBundle("regional-server.js");

    const ssrFn = new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for Remix",
      handler,
      runtime,
      memorySize,
      timeout,
      nodejs: {
        format: "cjs",
        ...nodejs,
        esbuild: {
          ...esbuild,
          ...nodejs?.esbuild,
          inject: [...(nodejs?.esbuild?.inject || []), ...esbuild.inject],
        },
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

    const { handler, esbuild } =
      this.createServerLambdaBundle("edge-server.js");

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      handler,
      runtime,
      timeout,
      memorySize,
      bind,
      environment,
      permissions,
      nodejs: {
        format: "cjs",
        ...nodejs,
        esbuild: {
          ...esbuild,
          ...nodejs?.esbuild,
          inject: [...(nodejs?.esbuild?.inject || []), ...esbuild.inject],
        },
      },
    });
  }
}
