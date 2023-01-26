import fs from "fs";
import url from "url";
import path from "path";
import * as esbuild from "esbuild";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { Function } from "./Function.js";
import { EdgeFunction } from "./EdgeFunction.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

/**
 * The `AstroSite` construct is a higher level CDK construct that makes it easy to create a Astro app.
 * @example
 * Deploys a Astro app in the `my-astro-app` directory.
 *
 * ```js
 * new AstroSite(stack, "web", {
 *   path: "my-astro-app/",
 * });
 * ```
 */
export class AstroSite extends SsrSite {
  protected initBuildConfig() {
    return {
      serverBuildOutputFile: "dist/server/entry.mjs",
      clientBuildOutputDir: "dist/client",
      clientBuildVersionedSubDir: "assets",
      siteStub: path.resolve(__dirname, "../support/astro-site-html-stub"),
    };
  }

  protected validateBuildOutput() {
    const serverDir = path.join(this.props.path, "dist/server");
    const clientDir = path.join(this.props.path, "dist/client");
    if (!fs.existsSync(serverDir) || !fs.existsSync(clientDir)) {
      throw new Error(
        `Build output inside "dist/" does not contain the "server" and "client" folders. Make sure Server-side Rendering (SSR) is enabled in your Astro app. If you are looking to deploy the Astro app as a static site, please use the StaticSite construct — https://docs.sst.dev/constructs/StaticSite`
      );
    }

    super.validateBuildOutput();
  }

  protected createFunctionForRegional(): lambda.Function {
    const {
      defaults,
      environment,
      bind,
      vpc,
      vpcSubnets,
      securityGroups,
      allowAllOutbound,
      allowPublicSubnet,
    } = this.props;

    // Bundle code
    const handler = this.isPlaceholder
      ? path.resolve(
        __dirname,
        "../support/ssr-site-function-stub/index.handler"
      )
      : path.join(this.props.path, "dist", "server", "entry.handler");

    // Create function
    const fn = new Function(this, `ServerFunction`, {
      description: "Server handler",
      handler,
      bind,
      vpc,
      vpcSubnets,
      securityGroups,
      allowAllOutbound,
      allowPublicSubnet,
      logRetention: "three_days",
      runtime: "nodejs16.x",
      memorySize: defaults?.function?.memorySize || "512 MB",
      timeout: defaults?.function?.timeout || "10 seconds",
      nodejs: {
        format: "esm",
      },
      enableLiveDev: false,
      environment,
    });
    fn._disableBind = true;

    return fn;
  }

  protected createFunctionForEdge(): EdgeFunction {
    const { defaults, environment } = this.props;

    // Bundle code
    let bundlePath;
    let handler;
    if (this.isPlaceholder) {
      bundlePath = path.resolve(__dirname, "../support/ssr-site-function-stub");
      handler = "index.handler";
    } else {
      // Create a directory that we will use to create the bundled version
      // of the "core server build" along with our custom Lamba server handler.
      const outputPath = path.resolve(
        path.join(
          this.sstBuildDir,
          `AstroSiteFunction-${this.node.id}-${this.node.addr}`
        )
      );

      const result = esbuild.buildSync({
        entryPoints: [
          path.join(this.props.path, this.buildConfig.serverBuildOutputFile),
        ],
        target: "esnext",
        format: "esm",
        platform: "node",
        metafile: true,
        bundle: true,
        write: true,
        allowOverwrite: true,
        outfile: path.join(outputPath, "entry.mjs"),
        banner: {
          js: [
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
          ].join(""),
        },
      });

      if (result.errors.length > 0) {
        result.errors.forEach((error) => console.error(error));
        throw new Error(
          `There was a problem bundling the function code for the ${this.id} AstroSite.`
        );
      }

      // Create package.json
      fs.writeFileSync(
        path.join(outputPath, "package.json"),
        `{"type":"module"}`
      );

      bundlePath = outputPath;
      handler = "entry.handler";
    }

    // Create function
    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      bundlePath,
      handler,
      timeout: defaults?.function?.timeout,
      memory: defaults?.function?.memorySize,
      permissions: defaults?.function?.permissions,
      environment,
      format: "esm",
    });
  }
}
