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
      serverBuildOutputFile: "dist/server/index.mjs",
      clientBuildOutputDir: "dist/client",
      clientBuildVersionedSubDir: "assets",
      siteStub: path.resolve(__dirname, "../support/solid-start-site-html-stub"),
    };
  }

  protected createFunctionForRegional(): lambda.Function {
    const { defaults, environment } = this.props;

    // Bundle code
    const handler = this.isPlaceholder
      ? path.resolve(__dirname, "../support/ssr-site-function-stub/index.handler")
      : path.join(this.props.path, "dist", "server", "index.handler");

    // Create function
    const fn = new Function(this, `ServerFunction`, {
      description: "Server handler",
      handler,
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
    }
    else {
      // Create a directory that we will use to create the bundled version
      // of the "core server build" along with our custom Lamba server handler.
      const outputPath = path.resolve(
        path.join(
          this.sstBuildDir,
          `SolidStartSiteFunction-${this.node.id}-${this.node.addr}`
        )
      );

      const result = esbuild.buildSync({
        entryPoints: [path.join(this.props.path, this.buildConfig.serverBuildOutputFile)],
        target: "esnext",
        format: "esm",
        platform: "node",
        metafile: true,
        bundle: true,
        write: true,
        allowOverwrite: true,
        outfile: path.join(outputPath, "server.mjs"),
        banner: {
          js: [
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
          ].join(""),
        },
      });

      if (result.errors.length > 0) {
        result.errors.forEach((error) => console.error(error));
        throw new Error(`There was a problem bundling the function code for the ${this.id} SolidStartSite.`);
      }

      // Create package.json
      fs.writeFileSync(path.join(outputPath, "package.json"), `{"type":"module"}`);

      bundlePath = outputPath;
      handler = "server.handler";
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