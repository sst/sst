import fs from "fs";
import url from "url";
import path from "path";
import * as esbuild from "esbuild";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { Logger } from "../logger.js";
import { SsrSite } from "./SsrSite.js";
import { EdgeFunction } from "./EdgeFunction.js";

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
      siteStub: path.resolve(__dirname, "../support/remix-site-html-stub"),
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
      `../support/remix-site-function/${wrapperFile}`,
    );
    fs.copyFileSync(templatePath, serverPath);

    Logger.debug(`Bundling server`);

    // Create a directory that we will use to create the bundled version
    // of the "core server build" along with our custom Lamba server handler.
    const outputPath = path.resolve(
      path.join(
        this.sstBuildDir,
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

  private createServerLambdaBundleWithStub(): string {
    // Use existing stub bundle in assets
    return path.resolve(__dirname, "../support/ssr-site-function-stub");
  }

  protected createFunctionForRegional(): lambda.Function {
    const { defaults, environment } = this.props;

    const bundlePath = this.isPlaceholder
      ? this.createServerLambdaBundleWithStub()
      : this.createServerLambdaBundle("regional-server.js");

    return new lambda.Function(this, `ServerFunction`, {
      description: "Server handler for Remix",
      handler: "server.handler",
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromAsset(bundlePath),
      architecture: defaults?.function?.architecture === 'arm_64' ? lambda.Architecture.ARM_64 : lambda.Architecture.X86_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: defaults?.function?.memorySize || 512,
      timeout: Duration.seconds(defaults?.function?.timeout || 10),
      environment,
    });
  }

  protected createFunctionForEdge(): EdgeFunction {
    const { defaults, environment } = this.props;

    const bundlePath = this.isPlaceholder
      ? this.createServerLambdaBundleWithStub()
      : this.createServerLambdaBundle("edge-server.js");

    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      bundlePath,
      handler: "server.handler",
      timeout: defaults?.function?.timeout,
      memory: defaults?.function?.memorySize,
      permissions: defaults?.function?.permissions,
      environment,
    });
  }
}