import fs from "fs";
import path from "path";

import { SsrSite, SsrSiteProps } from "./SsrSite.js";
import { SsrFunction } from "./SsrFunction.js";
import { EdgeFunction } from "./EdgeFunction.js";
import { Construct } from "constructs";

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
  constructor(
    scope: Construct,
    id: string,
    props?: Omit<SsrSiteProps, "streaming">
  ) {
    // Astro apps should always be configured for streaming
    super(scope, props?.cdk?.id || id, { ...props, streaming: true });
  }

  protected initBuildConfig() {
    return {
      typesPath: "src",
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

  protected createFunctionForRegional() {
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

    return new SsrFunction(this, `ServerFunction`, {
      description: "Server handler for Astro",
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
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
  }

  protected createFunctionForEdge() {
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
      handler: path.join(this.props.path, "dist", "server", "entry.handler"),
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

  public getConstructMetadata() {
    return {
      type: "AstroSite" as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
