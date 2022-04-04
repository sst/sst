/* eslint-disable @typescript-eslint/ban-types */
// Note: disabling ban-type rule so we don't get an error referencing the class Function

import path from "path";
import * as esbuild from "esbuild";
import * as fs from "fs-extra";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from "aws-cdk-lib/aws-ssm";

import { App } from "./App";
import { Stack } from "./Stack";
import { SSTConstruct } from "./Construct";
import { Permissions, attachPermissionsToRole } from "./util/permission";
import { State, Runtime } from "@serverless-stack/core";

const supportedRuntimes = [
  lambda.Runtime.NODEJS,
  lambda.Runtime.NODEJS_4_3,
  lambda.Runtime.NODEJS_6_10,
  lambda.Runtime.NODEJS_8_10,
  lambda.Runtime.NODEJS_10_X,
  lambda.Runtime.NODEJS_12_X,
  lambda.Runtime.NODEJS_14_X,
  lambda.Runtime.PYTHON_2_7,
  lambda.Runtime.PYTHON_3_6,
  lambda.Runtime.PYTHON_3_7,
  lambda.Runtime.PYTHON_3_8,
  lambda.Runtime.PYTHON_3_9,
  lambda.Runtime.DOTNET_CORE_1,
  lambda.Runtime.DOTNET_CORE_2,
  lambda.Runtime.DOTNET_CORE_2_1,
  lambda.Runtime.DOTNET_CORE_3_1,
  lambda.Runtime.GO_1_X,
];

export type FunctionInlineDefinition = string | Function;
export type FunctionDefinition = string | Function | FunctionProps;

export type Runtime =
  | "nodejs"
  | "nodejs4.3"
  | "nodejs6.10"
  | "nodejs8.10"
  | "nodejs10.x"
  | "nodejs12.x"
  | "nodejs14.x"
  | "python2.7"
  | "python3.6"
  | "python3.7"
  | "python3.8"
  | "python3.9"
  | "dotnetcore1.0"
  | "dotnetcore2.0"
  | "dotnetcore2.1"
  | "dotnetcore3.1"
  | "go1.x";

export interface FunctionProps
  extends Omit<
    lambda.FunctionOptions,
    "functionName" | "timeout" | "runtime" | "tracing" | "layers"
  > {
  /**
   * Override the automatically generated name
   *
   * @default An automatically generated name
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   functionName: "my-function",
   * })
   *```
   */
  functionName?: string | ((props: FunctionNameProps) => string);
  /**
   * Path to the entry point and handler function. Of the format:
   * `/path/to/file.function`.
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   * })
   *```
   */
  handler?: string;
  /**
   * Root directory of the project, typically where package.json is located. Set if using a monorepo with multiple subpackages
   *
   * @default Defaults to the same directory as sst.json
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   srcPath: "packages/backend",
   *   handler: "function.handler",
   * })
   *```
   */
  srcPath?: string;
  /**
   * The runtime environment.
   *
   * @default "nodejs12.x"
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   runtime: "nodejs14.x",
   * })
   *```
   */
  runtime?: Runtime;
  /**
   * The amount of memory in MB allocated.
   *
   * @default 1024
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   memorySize: 2048,
   * })
   *```
   */
  memorySize?: number;
  /**
   * The execution timeout in seconds.
   *
   * @default 10
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   timeout: 30,
   * })
   *```
   */
  timeout?: number;
  /**
   * Enable AWS X-Ray Tracing.
   *
   * @default "active"
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   tracing: "pass_through",
   * })
   *```
   */
  tracing?: Lowercase<keyof typeof lambda.Tracing>;
  /**
   * Enable local development
   *
   * @default true
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   enableLiveDev: false
   * })
   *```
   */
  enableLiveDev?: boolean;
  /**
   * Configure environment variables for the function
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   environment: {
   *     TABLE_NAME: table.tableName,
   *   }
   * })
   * ```
   */
  environment?: Record<string, string>;
  /**
   * Configure or disable bundling options
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     copyFiles: [{ from: "src/index.js" }]
   *   }
   * })
   *```
   */
  bundle?: FunctionBundleProp;
  /**
   * Configure permissions for the function
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   permissions: ["ses", bucket]
   * })
   * ```
   */
  permissions?: Permissions;
  /**
   * Configure layers for the function
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   layers: ["arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22", myLayer]
   * })
   * ```
   */
  layers?: (string | lambda.ILayerVersion)[];
}

export interface FunctionNameProps {
  /**
   * The stack the function is being created in
   */
  stack: Stack;
  /**
   * The function properties
   */
  functionProps: FunctionProps;
}

export interface FunctionHandlerProps {
  srcPath: string;
  handler: string;
  bundle: FunctionBundleProp;
  runtime: string;
}

export type FunctionBundleProp =
  | FunctionBundleNodejsProps
  | FunctionBundlePythonProps
  | boolean;

interface FunctionBundleBase {
  /**
   * Used to configure additional files to copy into the function bundle
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     copyFiles: [{ from: "src/index.js" }]
   *   }
   * })
   *```
   */
  copyFiles?: FunctionBundleCopyFilesProps[];
}

/**
 * Used to configure NodeJS bundling options
 *
 * @example
 * ```js
 * new Function(stack, "Function", {
 *   bundle: {
 *    format: "esm",
 *    minify: false
 *   }
 * })
 * ```
 */
export interface FunctionBundleNodejsProps extends FunctionBundleBase {
  /**
   * Configure additional esbuild loaders for other file extensions
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     loader: {
   *      ".png": "file"
   *     }
   *   }
   * })
   * ```
   */
  loader?: Record<string, esbuild.Loader>;
  /**
   * Packages that will not be included in the bundle. Usually used to exclude dependencies that are provided in layers
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     external: ["prisma"]
   *   }
   * })
   * ```
   */
  externalModules?: string[];
  /**
   * Packages that will be excluded from the bundle and installed into node_modules instead. Useful for dependencies that cannot be bundled, like those with binary dependencies.
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     nodeModules: ["pg"]
   *   }
   * })
   * ```
   */
  nodeModules?: string[];
  /**
   * Hooks to run at various stages of bundling
   */
  commandHooks?: lambdaNode.ICommandHooks;
  /**
   * This allows you to customize esbuild config.
   */
  esbuildConfig?: {
    /**
     * Replace global identifiers with constant expressions.
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   bundle: {
     *     esbuildConfig: {
     *       define: {
     *         str: "text"
     *       }
     *     }
     *   }
     * })
     * ```
     */
    define?: Record<string, string>;
    /**
     * When minifying preserve names of functions and variables
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   bundle: {
     *     esbuild: {
     *       keepNames: true
     *     }
     *   }
     * })
     * ```
     */
    keepNames?: boolean;
    /**
     * Path to a file that returns an array of esbuild plugins
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   bundle: {
     *     esbuild: {
     *       plugins: "path/to/plugins.js"
     *     }
     *   }
     * })
     * ```
     *
     * Where `path/to/plugins.js` looks something like this:
     *
     * ```js
     * const { esbuildDecorators } = require("@anatine/esbuild-decorators");
     *
     * module.exports = [
     *   esbuildDecorators(),
     * ];
     * ```
     */
    plugins?: string;
  };
  /**
   * Enable or disable minification
   *
   * @default true
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     minify: false
   *   }
   * })
   * ```
   */
  minify?: boolean;
  /**
   * Configure bundle format
   *
   * @default "cjs"
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     format: "esm"
   *   }
   * })
   * ```
   */
  format?: "cjs" | "esm";
}

/**
 * Used to configure Python bundling options
 *
 * @example
 * ```js
 * new Function(stack, "Function", {
 *   bundle: {
 *     installCommands: [
 *       'export VARNAME="my value"',
 *       'pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple',
 *     ]
 *   }
 * })
 * ```
 */
export interface FunctionBundlePythonProps extends FunctionBundleBase {
  /**
   * A list of commands to override the [default installing behavior](Function#bundle) for Python dependencies.
   *
   * Each string in the array is a command that'll be run. For example:
   *
   * @default "[]"
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   bundle: {
   *     installCommands: [
   *       'export VARNAME="my value"',
   *       'pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple',
   *     ]
   *   }
   * })
   * ```
   */
  installCommands?: string[];
}

/**
 * Used to configure additional files to copy into the function bundle
 *
 * @example
 * ```js
 * new Function(stack, "Function", {
 *   bundle: {
 *     copyFiles: [{ from: "src/index.js" }]
 *   }
 * })
 *```
 */

export interface FunctionBundleCopyFilesProps {
  /**
   * Source path relative to sst.json
   */
  from: string;
  /**
   * Destination path relative to function root in bundle
   */
  to?: string;
}

/**
 * A construct for a Lambda Function that allows you to [develop your it locally](live-lambda-development.md). Supports JS, TypeScript, Python, Golang, and C#. It also applies a couple of defaults:
 *
 * - Sets the default memory setting to 1024MB.
 * - Sets the default Lambda function timeout to 10 seconds.
 * - [Enables AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html) by default so you can trace your serverless applications.
 * - `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is turned on. Meaning that the Lambda function will automatically reuse TCP connections when working with the AWS SDK. [Read more about this here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html).
 * - Sets the `IS_LOCAL` environment variable for the Lambda function when it is invoked locally through the `sst start` command.
 *
 * @example
 *
 * ### Creating a Function
 *
 * ```js
 * import { Function } from "@serverless-stack/resources";
 *
 * new Function(stack, "MySnsLambda", {
 *   handler: "src/sns/index.main",
 * });
 * ```
 */
export class Function extends lambda.Function implements SSTConstruct {
  public readonly _isLiveDevEnabled: boolean;
  private readonly localId: string;

  constructor(scope: Construct, id: string, props: FunctionProps) {
    const root = scope.node.root as App;
    const stack = Stack.of(scope) as Stack;

    // Merge with app defaultFunctionProps
    // note: reverse order so later prop override earlier ones
    stack.defaultFunctionProps
      .slice()
      .reverse()
      .forEach((per) => {
        props = Function.mergeProps(per, props);
      });

    // Set defaults
    const functionName =
      props.functionName &&
      (typeof props.functionName === "string"
        ? props.functionName
        : props.functionName({ stack, functionProps: props }));
    const handler = props.handler;
    const timeout = cdk.Duration.seconds(props.timeout || 10);
    const srcPath = Function.normalizeSrcPath(props.srcPath || ".");
    const runtime = Function.normalizeRuntime(props.runtime);
    const memorySize = props.memorySize || 1024;
    const tracing =
      lambda.Tracing[
        (props.tracing || "active").toUpperCase() as keyof typeof lambda.Tracing
      ];
    let bundle = props.bundle;
    const permissions = props.permissions;
    const isLiveDevEnabled = props.enableLiveDev === false ? false : true;

    // Validate handler
    if (!handler) {
      throw new Error(`No handler defined for the "${id}" Lambda function`);
    }

    // Validate input
    const isNodeRuntime = runtime.toString().startsWith("nodejs");
    const isPythonRuntime = runtime.toString().startsWith("python");
    if (isNodeRuntime) {
      bundle = bundle === undefined ? true : props.bundle;
      if (!bundle && srcPath === ".") {
        throw new Error(
          `Bundle cannot be disabled for the "${id}" function since the "srcPath" is set to the project root. Read more here — https://github.com/serverless-stack/serverless-stack/issues/78`
        );
      }
    } else if (isPythonRuntime) {
      bundle = bundle === undefined ? {} : props.bundle;
      if (srcPath === ".") {
        throw new Error(
          `Cannot set the "srcPath" to the project root for the "${id}" function.`
        );
      }
    }

    const localId = path.posix
      .join(scope.node.path, id)
      .replace(/\$/g, "-")
      .replace(/\//g, "-");

    // Handle local development (ie. sst start)
    // - set runtime to nodejs12.x for non-Node runtimes (b/c the stub is in Node)
    // - set retry to 0. When the debugger is disconnected, the Cron construct
    //   will still try to periodically invoke the Lambda, and the requests would
    //   fail and retry. So when launching `sst start`, a couple of retry requests
    //   from recent failed request will be received. And this behavior is confusing.
    if (
      isLiveDevEnabled &&
      root.local &&
      root.debugEndpoint &&
      root.debugBucketName &&
      root.debugBucketArn
    ) {
      // If debugIncreaseTimeout is enabled:
      //   set timeout to 900. This will give people more time to debug the function
      //   without timing out the request. Note API Gateway requests have a maximum
      //   timeout of 29s. In this case, the API will timeout, but the Lambda function
      //   will continue to run.
      let debugOverrideProps;
      if (root.debugIncreaseTimeout) {
        debugOverrideProps = {
          timeout: cdk.Duration.seconds(900),
        };
      }

      if (root.debugBridge) {
        super(scope, id, {
          ...props,
          code: lambda.Code.fromAsset(
            path.resolve(__dirname, "../dist/bridge_client/")
          ),
          handler: "handler",
          functionName,
          runtime: lambda.Runtime.GO_1_X,
          memorySize,
          timeout,
          tracing,
          environment: {
            ...(props.environment || {}),
            SST_DEBUG_BRIDGE: root.debugBridge,
            SST_DEBUG_SRC_PATH: srcPath,
            SST_DEBUG_SRC_HANDLER: handler,
            SST_DEBUG_ENDPOINT: root.debugEndpoint,
          },
          layers: Function.buildLayers(scope, id, props),
          ...(debugOverrideProps || {}),
        });
      } else {
        super(scope, id, {
          ...props,
          code: lambda.Code.fromAsset(
            path.resolve(__dirname, "../dist/stub.zip")
          ),
          handler: "index.main",
          functionName,
          runtime: isNodeRuntime ? runtime : lambda.Runtime.NODEJS_12_X,
          memorySize,
          timeout,
          tracing,
          environment: {
            ...(props.environment || {}),
            SST_DEBUG_SRC_PATH: srcPath,
            SST_DEBUG_SRC_HANDLER: handler,
            SST_DEBUG_ENDPOINT: root.debugEndpoint,
            SST_DEBUG_BUCKET_NAME: root.debugBucketName,
          },
          layers: Function.buildLayers(scope, id, props),
          retryAttempts: 0,
          ...(debugOverrideProps || {}),
        });
      }
      State.Function.append(root.appPath, {
        id: localId,
        handler: handler,
        runtime: runtime.toString(),
        srcPath: srcPath,
        bundle: props.bundle,
      });
      this.addEnvironment("SST_FUNCTION_ID", localId);
      this.attachPermissions([
        new iam.PolicyStatement({
          actions: ["s3:*"],
          effect: iam.Effect.ALLOW,
          resources: [root.debugBucketArn, `${root.debugBucketArn}/*`],
        }),
      ]);
    }
    // Handle remove (ie. sst remove)
    else if (root.skipBuild) {
      // Note: need to override runtime as CDK does not support inline code
      //       for some runtimes.
      super(scope, id, {
        ...props,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, "../assets/Function/placeholder-stub")
        ),
        handler: "placeholder",
        functionName,
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize,
        timeout,
        tracing,
        environment: props.environment,
        layers: Function.buildLayers(scope, id, props),
      });
    }
    // Handle build
    else {
      console.log("Building function", handler);
      const bundled = Runtime.Handler.bundle({
        id: localId,
        root: root.appPath,
        handler: handler,
        runtime: runtime.toString(),
        srcPath: srcPath,
        bundle: props.bundle,
      })!;

      // Python builder returns AssetCode instead of directory
      const code = (() => {
        if ("directory" in bundled) {
          Function.copyFiles(bundle, srcPath, bundled.directory);
          return lambda.AssetCode.fromAsset(bundled.directory);
        }
        return bundled.asset;
      })();

      super(scope, id, {
        ...props,
        code: code!,
        handler: bundled.handler,
        functionName,
        runtime,
        memorySize,
        timeout,
        tracing,
        environment: props.environment,
        layers: Function.buildLayers(scope, id, props),
      });
    }

    // Enable reusing connections with Keep-Alive for NodeJs Lambda function
    if (isNodeRuntime) {
      this.addEnvironment("AWS_NODEJS_CONNECTION_REUSE_ENABLED", "1", {
        removeInEdge: true,
      });
    }

    // Attach permissions
    if (permissions) {
      this.attachPermissions(permissions);
    }

    root.registerLambdaHandler({
      bundle: props.bundle!,
      handler: handler,
      runtime: runtime.toString(),
      srcPath,
    });
    this._isLiveDevEnabled = isLiveDevEnabled;
    this.localId = localId;
  }

  /**
   * Attaches additional permissions to function
   *
   * @example
   * ```js {20}
   * fn.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    if (this.role) {
      attachPermissionsToRole(this.role as iam.Role, permissions);
    }
  }

  public getConstructMetadata() {
    return {
      type: "Function" as const,
      data: {
        localId: this.localId,
        arn: this.functionArn,
      },
    };
  }

  static buildLayers(scope: Construct, id: string, props: FunctionProps) {
    return (props.layers || []).map((layer) => {
      if (typeof layer === "string") {
        return lambda.LayerVersion.fromLayerVersionArn(
          scope,
          `${id}${layer}`,
          layer
        );
      }
      return Function.handleImportedLayer(scope, layer);
    });
  }

  static normalizeRuntime(runtime?: string): lambda.Runtime {
    runtime = runtime || "nodejs14.x";
    const runtimeClass = supportedRuntimes.find(
      (per) => per.toString() === runtime
    );
    if (!runtimeClass) {
      throw new Error(
        `The specified runtime is not supported for sst.Function. Only NodeJS, Python, Go, and .NET runtimes are currently supported.`
      );
    }
    return runtimeClass;
  }

  static normalizeSrcPath(srcPath: string): string {
    return srcPath.replace(/\/+$/, "");
  }

  static copyFiles(
    bundle: FunctionBundleProp | undefined,
    srcPath: string,
    buildPath: string
  ) {
    if (!bundle) return;
    if (typeof bundle === "boolean") return;
    if (!bundle.copyFiles) return;

    bundle.copyFiles.forEach((entry) => {
      const fromPath = path.join(srcPath, entry.from);
      if (!fs.existsSync(fromPath))
        throw new Error(
          `Tried to copy nonexistent file from "${path.resolve(
            fromPath
          )}" - check copyFiles entry "${entry.from}"`
        );
      const to = entry.to || entry.from;
      if (path.isAbsolute(to))
        throw new Error(`Copy destination path "${to}" must be relative`);
      const toPath = path.join(buildPath, to);
      fs.copySync(fromPath, toPath);
    });
  }

  static handleImportedLayer(
    scope: Construct,
    layer: lambda.ILayerVersion
  ): lambda.ILayerVersion {
    const layerStack = Stack.of(layer);
    const currentStack = Stack.of(scope);
    // Use layer directly if:
    // - layer is created in the current stack; OR
    // - layer is imported (ie. layerArn is a string)
    if (
      layerStack === currentStack ||
      !cdk.Token.isUnresolved(layer.layerVersionArn)
    ) {
      return layer;
    }
    // layer is created from another stack
    else {
      // set stack dependency b/c layerStack need to create the SSM first
      currentStack.addDependency(layerStack);
      // store layer ARN in SSM in layer's stack
      const parameterId = `${layer.node.id}Arn-${layer.node.addr}`;
      const parameterName = `/layers/${layerStack.node.id}/${parameterId}`;
      const existingSsmParam = layerStack.node.tryFindChild(parameterId);
      if (!existingSsmParam) {
        new ssm.StringParameter(layerStack, parameterId, {
          parameterName,
          stringValue: layer.layerVersionArn,
        });
      }
      // import layer from SSM value
      const layerId = `I${layer.node.id}-${layer.node.addr}`;
      const existingLayer = scope.node.tryFindChild(layerId);
      if (existingLayer) {
        return existingLayer as lambda.LayerVersion;
      } else {
        return lambda.LayerVersion.fromLayerVersionArn(
          scope,
          layerId,
          ssm.StringParameter.valueForStringParameter(scope, parameterName)
        );
      }
    }
  }

  static isInlineDefinition(
    definition: any
  ): definition is FunctionInlineDefinition {
    return typeof definition === "string" || definition instanceof Function;
  }

  static fromDefinition(
    scope: Construct,
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
        throw new Error(
          inheritErrorMessage ||
            `Cannot inherit default props when a Function is provided`
        );
      }
      return definition;
    } else if (definition instanceof lambda.Function) {
      throw new Error(
        `Please use sst.Function instead of lambda.Function for the "${id}" Function.`
      );
    } else if ((definition as FunctionProps).handler !== undefined) {
      return new Function(
        scope,
        id,
        Function.mergeProps(inheritedProps, definition)
      );
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
    const environmentProp =
      Object.keys(environment).length === 0 ? {} : { environment };

    // Merge layers
    const layers = [...(baseProps?.layers || []), ...(props?.layers || [])];
    const layersProp = layers.length === 0 ? {} : { layers };

    // Merge permissions
    let permissionsProp;
    if (baseProps?.permissions === "*") {
      permissionsProp = { permissions: baseProps.permissions };
    } else if (props?.permissions === "*") {
      permissionsProp = { permissions: props.permissions };
    } else {
      const permissions = (baseProps?.permissions || []).concat(
        props?.permissions || []
      );
      permissionsProp = permissions.length === 0 ? {} : { permissions };
    }

    return {
      ...(baseProps || {}),
      ...(props || {}),
      ...layersProp,
      ...environmentProp,
      ...permissionsProp,
    };
  }
}
