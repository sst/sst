/* eslint-disable @typescript-eslint/ban-types*/
// Note: disabling ban-type rule so we don't get an error referencing the class Function

import path from "path";
import * as esbuild from "esbuild";
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";

import { App } from "./App";
import { builder as nodeBuilder } from "./util/nodeBuilder";
import { builder as goBuilder } from "./util/goBuilder";
import { Permissions, attachPermissionsToRole } from "./util/permission";

const supportedRuntimes = [
  lambda.Runtime.NODEJS,
  lambda.Runtime.NODEJS_4_3,
  lambda.Runtime.NODEJS_6_10,
  lambda.Runtime.NODEJS_8_10,
  lambda.Runtime.NODEJS_10_X,
  lambda.Runtime.NODEJS_12_X,
  lambda.Runtime.NODEJS_14_X,
];

export type HandlerProps = FunctionHandlerProps;
export type FunctionDefinition = string | Function | FunctionProps;

export interface FunctionProps extends Omit<lambda.FunctionOptions, "timeout" | "runtime"> {
  /**
   * Path to the entry point and handler function. Of the format:
   * `/path/to/file.function`.
   */
  readonly handler?: string;
  /**
   * The source directory where the entry point is located. The node_modules in this
   * directory is used to generate the bundle.
   *
   * @default - Defaults to the app directory.
   */
  readonly srcPath?: string;
  /**
   * The runtime environment. Only runtimes of the Node.js and Go family are
   * supported.
   *
   * @default - Defaults to NODEJS_12_X
   */
  readonly runtime?: string | lambda.Runtime;
  /**
   * The amount of memory in MB allocated.
   *
   * @default - Defaults to 1024
   */
  readonly memorySize?: number;
  /**
   * The execution timeout in seconds.
   *
   * @default - number
   */
  readonly timeout?: number | cdk.Duration;
  /**
   * Enable AWS X-Ray Tracing.
   *
   * @default - Defaults to ACTIVE
   */
  readonly tracing?: lambda.Tracing;
  /**
   * Disable bundling with esbuild.
   *
   * @default - Defaults to true
   */
  readonly bundle?: boolean | FunctionBundleProps;
}

export interface FunctionHandlerProps {
  readonly srcPath: string;
  readonly handler: string;
  readonly bundle: boolean | FunctionBundleProps;
  readonly runtime: string;
}

export interface FunctionBundleProps {
  readonly loader?: { [ext: string]: esbuild.Loader };
  readonly externalModules?: string[];
  readonly nodeModules?: string[];
  readonly copyFiles?: FunctionBundleCopyFilesProps[];
}

export interface FunctionBundleCopyFilesProps {
  readonly from: string;
  readonly to: string;
}

export class Function extends lambda.Function {
  constructor(scope: cdk.Construct, id: string, props: FunctionProps) {
    const root = scope.node.root as App;
    props = Function.mergeProps(root.defaultFunctionProps, props);

    // Set defaults
    const handler = props.handler;
    let timeout = props.timeout || 10;
    const srcPath = props.srcPath || ".";
    const memorySize = props.memorySize || 1024;
    const tracing = props.tracing || lambda.Tracing.ACTIVE;
    let runtime = props.runtime || lambda.Runtime.NODEJS_12_X;
    const bundle = props.bundle === undefined ? true : props.bundle;

    // Validate handler
    if (!handler) {
      throw new Error(`No handler defined for the "${id}" Lambda function`);
    }
    if (!bundle && srcPath === ".") {
      throw new Error(
        `Bundle cannot be disabled for the "${id}" function since the srcPath is set to the project root. Read more here — https://github.com/serverless-stack/serverless-stack/issues/78`
      );
    }

    // Normalize runtime
    if (typeof runtime === "string") {
      const runtimeClass = supportedRuntimes.find(per => per.toString() === runtime);
      if (!runtimeClass) {
        throw new Error(
          `The specified runtime is not supported for sst.Function. Only NodeJS and Go runtimes are currently supported.`
        );
      }
      runtime = runtimeClass;
    }

    // Normalize timeout
    if (typeof timeout === "number") {
      timeout = cdk.Duration.seconds(timeout);
    }

    // Validate supported runtime
    const runtimeStr = runtime.toString();
    const isNodeRuntime = runtimeStr.startsWith("nodejs");
    const isGoRuntime = runtimeStr.startsWith("go");

    if (root.local) {
      super(scope, id, {
        ...props,
        // if runtime is not NodeJS, set it to nodejs12.x b/c the stub is written in NodeJS
        runtime: isNodeRuntime
          ? runtime
          : lambda.Runtime.NODEJS_12_X,
        tracing,
        memorySize,
        handler: "index.main",
        timeout, 
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, "../dist/stub.zip")
        ),
        environment: {
          ...(props.environment || {}),
          SST_DEBUG_SRC_PATH: srcPath,
          SST_DEBUG_SRC_HANDLER: handler,
          SST_DEBUG_ENDPOINT: root.debugEndpoint || "",
        },
      });
    } else {
      let outZip, outHandler;
      if (isGoRuntime) {
        const ret = goBuilder({
          srcPath,
          handler,
          buildDir: root.buildDir,
        });
        outZip = ret.outZip;
        outHandler = ret.outHandler;
      } else {
        const ret = nodeBuilder({
          bundle,
          srcPath,
          handler,
          runtime,
          buildDir: root.buildDir,
        });
        outZip = ret.outZip;
        outHandler = ret.outHandler;
      }
      super(scope, id, {
        ...props,
        runtime,
        tracing,
        memorySize,
        handler: outHandler,
        code: lambda.Code.fromAsset(outZip),
        timeout,
      });
    }

    // Enable reusing connections with Keep-Alive for NodeJs Lambda function
    if (isNodeRuntime) {
      this.addEnvironment("AWS_NODEJS_CONNECTION_REUSE_ENABLED", "1", {
        removeInEdge: true,
      });
    }

    // register Lambda function in app
    root.registerLambdaHandler({
      srcPath,
      handler,
      bundle,
      runtime: runtimeStr,
    } as FunctionHandlerProps);
  }

  attachPermissions(permissions: Permissions): void {
    if (this.role) {
      attachPermissionsToRole(this.role as iam.Role, permissions);
    }
  }

  static fromDefinition(
    scope: cdk.Construct,
    id: string,
    definition: FunctionDefinition,
    inheritedProps?: FunctionProps,
    inheritErrorMessage?: string
  ): Function {
    if (typeof definition === "string") {
      return new Function(scope, id, {
        ...(inheritedProps || {}),
        handler: definition,
      });
    } else if (definition instanceof Function) {
      if (inheritedProps && Object.keys(inheritedProps).length > 0) {
        throw new Error(inheritErrorMessage || `Cannot inherit default props when a Function is provided`);
      }
      return definition;
    } else if (definition instanceof lambda.Function) {
      throw new Error(
        `Please use sst.Function instead of lambda.Function for the "${id}" Function.`
      );
    } else if ((definition as FunctionProps).handler !== undefined) {
      return new Function(scope, id, Function.mergeProps(inheritedProps, definition));
    }
    throw new Error(`Invalid function definition for the "${id}" Function`);
  }

  static mergeProps(
    baseProps?: FunctionProps,
    props?: FunctionProps
  ): FunctionProps {
    // Merge environment
    const environment = {
      ...(baseProps?.environment || {}),
      ...(props?.environment || {}),
    };
    const environmentProps = (Object.keys(environment).length === 0)
      ? {}
      : { environment };

    return {
      ...(baseProps || {}),
      ...(props || {}),
      ...environmentProps,
    };
  }
}
