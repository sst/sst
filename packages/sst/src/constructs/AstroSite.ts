import fs from "fs";
import url from "url";
import path from "path";
import { buildSync } from "esbuild";
import { Architecture, Function as CdkFunction } from "aws-cdk-lib/aws-lambda";

import { SsrSite } from "./SsrSite.js";
import { Function } from "./Function.js";
import { useProject } from "../project.js";
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

  protected createFunctionForRegional(): CdkFunction {
    const { runtime, memorySize, timeout, environment, bind, cdk } = this.props;

    // Create function
    const fn = new Function(this, `ServerFunction`, {
      description: "Server handler",
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
      bind,
      logRetention: "three_days",
      runtime,
      memorySize,
      timeout,
      nodejs: {
        format: "esm",
      },
      environment,
      ...cdk?.server,
      architecture:
        cdk?.server?.architecture === Architecture.ARM_64 ? "arm_64" : "x86_64",
    });
    fn._disableBind = true;

    return fn;
  }

  protected createFunctionForEdge(): EdgeFunction {
    const { runtime, timeout, memorySize, permissions, environment } =
      this.props;

    // Create a directory that we will use to create the bundled version
    // of the "core server build" along with our custom Lamba server handler.
    const outputPath = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `AstroSiteFunction-${this.node.id}-${this.node.addr}`
      )
    );

    const result = buildSync({
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

    // Create function
    return new EdgeFunction(this, `Server`, {
      scopeOverride: this,
      bundlePath: outputPath,
      handler: "entry.handler",
      runtime,
      timeout,
      memorySize,
      permissions,
      environment,
      format: "esm",
    });
  }
}
