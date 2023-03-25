import { Architecture, Function as CdkFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import esbuild from "esbuild";
import type { BuildOptions } from "esbuild";
import fs from "fs";
import path from "path";
import { SsrSite, SsrSiteProps } from "./SsrSite.js";
import { Function } from "./Function.js";
import { EdgeFunction } from "./EdgeFunction.js";

export interface ViteSsrSiteProps extends SsrSiteProps {
  serverHandler: {
    path: string;
    esbuild?: BuildOptions;
  };
}

export class ViteSsrSite extends SsrSite {
  protected declare props: ViteSsrSiteProps & {
    path: Exclude<ViteSsrSiteProps["path"], undefined>;
    runtime: Exclude<ViteSsrSiteProps["runtime"], undefined>;
    timeout: Exclude<ViteSsrSiteProps["timeout"], undefined>;
    memorySize: Exclude<ViteSsrSiteProps["memorySize"], undefined>;
    waitForInvalidation: Exclude<
      ViteSsrSiteProps["waitForInvalidation"],
      undefined
    >;
  };

  constructor(scope: Construct, id: string, props?: ViteSsrSiteProps) {
    super(scope, id, {
      ...props,
    });
  }

  protected initBuildConfig() {
    return {
      typesPath: ".",
      serverBuildOutputFile: "dist/index.mjs",
      clientBuildOutputDir: "dist/client",
      clientBuildVersionedSubDir: "dist/client/assets",
    };
  }

  protected validateBuildOutput() {
    const { serverHandler } = this.props;

    const input = path.join(this.props.path, serverHandler.path);
    const output = path.join(this.props.path, "dist", "index.mjs");

    esbuild.buildSync({
      keepNames: true,
      bundle: true,
      sourcemap: "inline",
      platform: "node",
      target: "esnext",
      metafile: true,
      format: "esm",
      logLevel: "silent",
      outfile: output,
      entryPoints: [input],
      ...(serverHandler.esbuild ?? {}),
    });

    const serverDir = path.join(this.props.path, "dist/server");
    const clientDir = path.join(this.props.path, "dist/client");
    if (!fs.existsSync(serverDir) || !fs.existsSync(clientDir)) {
      throw new Error(
        `Build output inside "dist/" does not contain the "server" and "client" folders. Make sure vite-plugin-ssr is enabled in your Vite app.`
      );
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

    const fn = new Function(this, 'server', {
      description: "Server handler",
      handler: path.join(this.props.path, "dist", "index.handler"),
      logRetention: "three_days",
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
      architecture:
        cdk?.server?.architecture === Architecture.ARM_64 ? "arm_64" : "x86_64",
    });
    fn._doNotAllowOthersToBind = true;

    return fn;
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

    return new EdgeFunction(this, 'server', {
      scopeOverride: this,
      handler: path.join(this.props.path, "dist", "index.handler"),
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
