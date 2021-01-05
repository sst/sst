import path from "path";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";

import { App } from "./App";
import { builder } from "./util/builder";

export interface FunctionProps extends lambda.FunctionOptions {
  /**
   * Path to the entry point of the function. A .js or .ts file.
   */
  readonly entry: string;
  /**
   * The exported function in the entry file.
   *
   * @default - Defaults to "handler"
   */
  readonly handler?: string;
  /**
   * The source directory where the entry point is located. The node_modules in this
   * directory is used to generate the bundle.
   *
   * @default - Defaults to project root
   */
  readonly srcPath?: string;
  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default - Defaults to NODEJS_12_X
   */
  readonly runtime?: lambda.Runtime;
  /**
   * Disable bundling with esbuild.
   *
   * @default - Defaults to true
   */
  readonly bundle?: boolean;
}

/**
 * Doe props for Lambda function.
 */
export interface HandlerProps {
  /**
   * Source path
   */
  readonly srcPath: string;

  /**
   * Source handler
   */
  readonly srcHandler: string;

  /**
   * Source entry
   */
  readonly srcEntry: string;
}

export class Function extends lambda.Function {
  constructor(scope: cdk.Construct, id: string, props: FunctionProps) {
    const root = scope.node.root as App;

    // Set defaults
    const handler = props.handler || "handler";
    const srcPath = props.srcPath || process.cwd();
    const runtime = props.runtime || lambda.Runtime.NODEJS_12_X;
    const bundle = props.bundle === undefined ? true : props.bundle;

    // Validate entry file
    if (!props.entry) {
      throw new Error(`No entry point defined for the ${id} Lambda function`);
    }

    // Validate NodeJS runtime
    if (
      ![
        lambda.Runtime.NODEJS,
        lambda.Runtime.NODEJS_10_X,
        lambda.Runtime.NODEJS_12_X,
        lambda.Runtime.NODEJS_4_3,
        lambda.Runtime.NODEJS_6_10,
        lambda.Runtime.NODEJS_8_10,
      ].includes(runtime)
    ) {
      throw new Error(
        `sst.Function does not support ${props.runtime}. Only NodeJS runtimes are currently supported.`
      );
    }

    if (root.local) {
      const srcHandler = handler;
      const srcEntry = props.entry;
      super(scope, id, {
        ...props,
        runtime,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, "../dist/stub.zip")
        ),
        handler: "index.main",
        environment: {
          ...(props.environment || {}),
          SST_DEBUG_SRC_PATH: srcPath,
          SST_DEBUG_SRC_ENTRY: srcEntry,
          SST_DEBUG_SRC_HANDLER: srcHandler,
          SST_DEBUG_ENDPOINT: root.debugEndpoint || "",
        },
      });
      // register Lambda function in app
      root.registerLambdaHandler({ srcPath, srcEntry, srcHandler } as HandlerProps);
    } else {
      const { outDir, outHandler } = builder({
        bundle: bundle,
        srcPath: srcPath,
        handler: handler,
        entry: props.entry,
        buildDir: root.buildDir,
      });

      console.log(outDir);
      super(scope, id, {
        ...props,
        runtime,
        handler: outHandler,
        code: lambda.Code.fromAsset(outDir),
      });
    }
  }
}
