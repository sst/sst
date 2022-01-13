/* eslint-disable @typescript-eslint/ban-types */
// Note: disabling ban-type rule so we don't get an error referencing the class Function

import path from "path";
import * as esbuild from "esbuild";
import * as fs from "fs-extra";
import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import crypto from "crypto";

import { App } from "./App";
import { Stack } from "./Stack";
import { SSTConstruct } from "./Construct";
import {
  PermissionType,
  Permissions,
  attachPermissionsToRole,
} from "./util/permission";
import { State } from "@serverless-stack/core";
import { Runtime } from "@serverless-stack/core";

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
  lambda.Runtime.DOTNET_CORE_1,
  lambda.Runtime.DOTNET_CORE_2,
  lambda.Runtime.DOTNET_CORE_2_1,
  lambda.Runtime.DOTNET_CORE_3_1,
  lambda.Runtime.GO_1_X,
];

export type HandlerProps = FunctionHandlerProps;
export type FunctionDefinition = string | Function | FunctionProps;

export interface FunctionProps
  extends Omit<lambda.FunctionOptions, "functionName" | "timeout" | "runtime"> {
  /**
   * The source directory where the entry point is located. The node_modules in this
   * directory is used to generate the bundle.
   *
   * @default - A name for the function or a callback that returns the name.
   */
  functionName?: string | ((props: FunctionNameProps) => string);
  /**
   * Path to the entry point and handler function. Of the format:
   * `/path/to/file.function`.
   */
  handler?: string;
  /**
   * The source directory where the entry point is located. The node_modules in this
   * directory is used to generate the bundle.
   *
   * @default - Defaults to the app directory.
   */
  srcPath?: string;
  /**
   * The runtime environment.
   *
   * @default - Defaults to NODEJS_12_X
   */
  runtime?:
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
    | "dotnetcore1.0"
    | "dotnetcore2.0"
    | "dotnetcore2.1"
    | "dotnetcore3.1"
    | "go1.x"
    | lambda.Runtime;
  /**
   * The amount of memory in MB allocated.
   *
   * @default - Defaults to 1024
   */
  memorySize?: number;
  /**
   * The execution timeout in seconds.
   *
   * @default - number
   */
  timeout?: number | cdk.Duration;
  /**
   * Enable AWS X-Ray Tracing.
   *
   * @default - Defaults to ACTIVE
   */
  tracing?: lambda.Tracing;

  /**
   * Enable local development
   *
   * @default - Defaults to true
   */
  enableLiveDev?: boolean;

  /**
   * Disable bundling with esbuild.
   *
   * @default - Defaults to true
   */
  bundle?: FunctionBundleProp;
  permissions?: Permissions;
  layers?: lambda.ILayerVersion[];
}

export interface FunctionNameProps {
  stack: Stack;
  functionProps: FunctionProps;
}

export interface FunctionHandlerProps {
  srcPath: string;
  handler: string;
  bundle: FunctionBundleProp;
  runtime: string;
}

export type FunctionBundleProp = FunctionBundleObject | boolean;

export type FunctionBundleObject = FunctionBundleBase &
  (FunctionBundleNodejsProps | FunctionBundlePythonProps);

export type FunctionBundleBase = {
  readonly copyFiles?: FunctionBundleCopyFilesProps[];
};

export interface FunctionBundleNodejsProps {
  loader?: { [ext: string]: esbuild.Loader };
  externalModules?: string[];
  nodeModules?: string[];
  commandHooks?: lambdaNode.ICommandHooks;
  esbuildConfig?: FunctionBundleEsbuildConfig;
  minify?: boolean;
}

export interface FunctionBundlePythonProps {
  installCommands?: string[];
}

export interface FunctionBundleCopyFilesProps {
  from: string;
  to?: string;
}

export interface FunctionBundleEsbuildConfig {
  define?: { [key: string]: string };
  keepNames?: boolean;
  plugins?: string;
}

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
    let timeout = props.timeout || 10;
    const srcPath = Function.normalizeSrcPath(props.srcPath || ".");
    const memorySize = props.memorySize || 1024;
    const tracing = props.tracing || lambda.Tracing.ACTIVE;
    let runtime = props.runtime || lambda.Runtime.NODEJS_12_X;
    let bundle = props.bundle;
    const permissions = props.permissions;
    const isLiveDevEnabled = props.enableLiveDev === false ? false : true;

    // Validate handler
    if (!handler) {
      throw new Error(`No handler defined for the "${id}" Lambda function`);
    }

    // Normalize runtime
    const runtimeStr =
      typeof runtime === "string" ? runtime : runtime.toString();
    const runtimeClass = supportedRuntimes.find(
      (per) => per.toString() === runtimeStr
    );
    if (!runtimeClass) {
      throw new Error(
        `The specified runtime is not supported for sst.Function. Only NodeJS, Python, Go, and .NET runtimes are currently supported.`
      );
    }
    runtime = runtimeClass;

    // Normalize timeout
    if (typeof timeout === "number") {
      timeout = cdk.Duration.seconds(timeout);
    }

    // Validate input
    const isNodeRuntime = runtimeStr.startsWith("nodejs");
    const isPythonRuntime = runtimeStr.startsWith("python");
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

    const localId = crypto
      .createHash("sha1")
      .update(scope.node.id + id)
      .digest("hex")
      .substring(0, 8);

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
          functionName,
          runtime: lambda.Runtime.GO_1_X,
          tracing,
          timeout,
          memorySize,
          handler: "handler",
          code: lambda.Code.fromAsset(
            path.resolve(__dirname, "../dist/bridge_client/")
          ),
          environment: {
            ...(props.environment || {}),
            SST_DEBUG_BRIDGE: root.debugBridge,
            SST_DEBUG_SRC_PATH: srcPath,
            SST_DEBUG_SRC_HANDLER: handler,
            SST_DEBUG_ENDPOINT: root.debugEndpoint,
          },
          layers: Function.handleImportedLayers(scope, props.layers || []),
          ...(debugOverrideProps || {}),
        });
      } else {
        super(scope, id, {
          ...props,
          functionName,
          runtime: isNodeRuntime ? runtime : lambda.Runtime.NODEJS_12_X,
          tracing,
          timeout,
          memorySize,
          handler: "index.main",
          retryAttempts: 0,
          code: lambda.Code.fromAsset(
            path.resolve(__dirname, "../dist/stub.zip")
          ),
          environment: {
            ...(props.environment || {}),
            SST_DEBUG_SRC_PATH: srcPath,
            SST_DEBUG_SRC_HANDLER: handler,
            SST_DEBUG_ENDPOINT: root.debugEndpoint,
            SST_DEBUG_BUCKET_NAME: root.debugBucketName,
          },
          layers: Function.handleImportedLayers(scope, props.layers || []),
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
        functionName,
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: "placeholder",
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, "../assets/Function/placeholder-stub")
        ),
        timeout,
        layers: Function.handleImportedLayers(scope, props.layers || []),
      });
    }
    // Handle build
    else {
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
        functionName,
        runtime,
        tracing,
        memorySize,
        handler: bundled.handler,
        code: code!,
        timeout,
        layers: Function.handleImportedLayers(scope, props.layers || []),
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

  static handleImportedLayers(
    scope: Construct,
    layers: lambda.ILayerVersion[]
  ): lambda.ILayerVersion[] {
    return layers.map((layer) => {
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
    });
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
    if (
      baseProps?.permissions === PermissionType.ALL ||
      props?.permissions === PermissionType.ALL
    ) {
      permissionsProp = { permissions: PermissionType.ALL };
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
