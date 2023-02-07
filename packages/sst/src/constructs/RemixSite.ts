import fs from "fs";
import url from "url";
import path from "path";
import * as esbuild from "esbuild";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { Duration as CdkDuration, RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { Logger } from "../logger.js";
import { SsrSite } from "./SsrSite.js";
import { useProject } from "../project.js";
import { EdgeFunction } from "./EdgeFunction.js";
import { toCdkSize } from "./util/size.js";
import { toCdkDuration } from "./util/duration.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

type RemixConfig = {
  assetsBuildDirectory: string;
  publicPath: string;
  serverBuildPath: string;
  serverBuildTarget: string;
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
      serverBuildTarget: "node-cjs",
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
      serverBuildOutputFile: "build/index.js",
      clientBuildOutputDir: "public",
      clientBuildVersionedSubDir: "build",
    };
  }

  private createServerLambdaBundle(wrapperFile: string): string {
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

    Logger.debug(`Creating Lambda@Edge handler for server`);

    // Resolve the path to create the server lambda handler at.
    const serverPath = path.join(this.props.path, "build/server.js");

    // Write the server lambda
    const templatePath = path.resolve(
      __dirname,
      `../support/remix-site-function/${wrapperFile}`
    );
    fs.copyFileSync(templatePath, serverPath);

    Logger.debug(`Bundling server`);

    // Create a directory that we will use to create the bundled version
    // of the "core server build" along with our custom Lamba server handler.
    const outputPath = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `RemixSiteFunction-${this.node.id}-${this.node.addr}`
      )
    );

    // Copy the Remix polyfil to the server build directory
    const polyfillSource = path.resolve(
      __dirname,
      "../support/remix-site-function/polyfill.js"
    );
    const polyfillDest = path.join(this.props.path, "build/polyfill.js");
    fs.copyFileSync(polyfillSource, polyfillDest);

    const result = esbuild.buildSync({
      entryPoints: [serverPath],
      bundle: true,
      target: "node16",
      platform: "node",
      external: ["aws-sdk"],
      outfile: path.join(outputPath, "server.js"),
      // We need to ensure that the polyfills are injected above other code that
      // will depend on them. Importing them within the top of the lambda code
      // doesn't appear to guarantee this, we therefore leverage ESBUild's
      // `inject` option to ensure that the polyfills are injected at the top of
      // the bundle.
      inject: [polyfillDest],
    });

    if (result.errors.length > 0) {
      result.errors.forEach((error) => console.error(error));
      throw new Error(`There was a problem bundling the server.`);
    }

    return outputPath;
  }

  protected createFunctionForRegional(): lambda.Function {
    const { runtime, timeout, memorySize, environment, cdk } = this.props;

    const bundlePath = this.createServerLambdaBundle("regional-server.js");

    return new lambda.Function(this, `ServerFunction`, {
      description: "Server handler for Remix",
      handler: "server.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(bundlePath),
      runtime:
        runtime === "nodejs14.x"
          ? lambda.Runtime.NODEJS_14_X
          : runtime === "nodejs16.x"
          ? lambda.Runtime.NODEJS_16_X
          : lambda.Runtime.NODEJS_18_X,
      memorySize:
        typeof memorySize === "string"
          ? toCdkSize(memorySize).toMebibytes()
          : memorySize,
      timeout:
        typeof timeout === "string"
          ? toCdkDuration(timeout)
          : CdkDuration.seconds(timeout),
      environment,
      ...cdk?.server,
    });
  }

  protected createFunctionForEdge(): EdgeFunction {
    const { runtime, timeout, memorySize, permissions, environment } =
      this.props;

    const bundlePath = this.createServerLambdaBundle("edge-server.js");

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      format: "cjs",
      bundlePath,
      handler: "server.handler",
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
    });
  }
}
