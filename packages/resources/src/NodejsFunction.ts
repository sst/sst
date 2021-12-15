/* eslint-disable prefer-const */
import { Runtime, Tracing } from "@aws-cdk/aws-lambda";
import {
  BundlingOptions,
  NodejsFunction as CdkNodejsFunction,
  NodejsFunctionProps as CdkNodejsFunctionProps,
} from "@aws-cdk/aws-lambda-nodejs";
import { Construct, Duration } from "@aws-cdk/core";
import { existsSync } from "fs";
import path from "path";
import cloneDeep from "lodash.clonedeep";
import { Role } from "@aws-cdk/aws-iam";
import { Stack } from "./Stack";
import { Function, FunctionBundleObject, FunctionProps } from "./Function";
import {
  attachPermissionsToRole,
  PermissionType,
  Permissions,
} from "./util/permission";

export interface NodejsFunctionProps extends CdkNodejsFunctionProps {
  grantDatabaseAccess?: boolean;
  handler?: string;
  srcPath?: string;
  permissions?: Permissions;
}

/**
 * Compatibility layer between SST.Function and NodejsFunction
 */
export class NodejsFunction extends CdkNodejsFunction {
  grantDatabaseAccess?: boolean;

  constructor(scope: Construct, id: string, baseProps: NodejsFunctionProps) {
    let { grantDatabaseAccess, handler, ...props } = baseProps;

    const stack = Stack.of(scope) as Stack;
    // merge props with default
    stack.defaultFunctionProps
      .slice()
      .reverse()
      .forEach((per) => {
        props = NodejsFunction.mergeProps(per, props);
      });
    // Set defaults
    let timeout = props.timeout || Duration.seconds(10);
    const srcPath = Function.normalizeSrcPath(props.srcPath || ".");
    const memorySize = props.memorySize || 1024;
    const tracing = props.tracing || Tracing.ACTIVE;
    const permissions = props.permissions;

    // parse handler
    let entry: string | undefined = undefined;
    if (handler) {
      // split on '.'
      const origHandler = handler;
      const lastDotIdx = origHandler.lastIndexOf(".");
      entry = origHandler.substring(0, lastDotIdx);
      handler = origHandler.substring(lastDotIdx + 1);

      if (entry) {
        // find extension
        let entryPath = "";
        const foundExt = [".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"].find(
          (ext) => {
            entryPath = path.join(srcPath, entry + ext);
            return existsSync(entryPath);
          }
        );
        if (!foundExt) {
          throw new Error(`Cannot find a handler file for "${entry}".`);
        }
        entry = path.join(srcPath, entry + foundExt);
      }
    }

    // construct
    const mergedProps = {
      ...props,
      handler,
      entry,
      tracing,
      memorySize,
      timeout,
      bundling: {
        ...props.bundling,
        sourceMap: true,
        sourcesContent: false,
      },
    };
    super(scope, id, mergedProps);

    // Attach permissions
    if (permissions) {
      this.attachPermissions(permissions);
    }

    // extra props to tag function with (should be refactored)
    if (grantDatabaseAccess && !props.vpc)
      throw new Error("vpc is requied if grantDatabaseAccess is true");
    this.grantDatabaseAccess = grantDatabaseAccess;
  }

  static mergeProps(
    baseProps?: FunctionProps,
    props?: NodejsFunctionProps
  ): NodejsFunctionProps {
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

    // workaround for different FunctionProps.Runtime type, timeout
    let { runtime, timeout, handler, bundle, ...base } = baseProps || {};
    if (typeof timeout === "number") timeout = Duration.seconds(timeout);

    // if (!handler) throw new Error("handler is not defined")
    const baseNodejsProps: NodejsFunctionProps = {
      ...base,
      runtime: Runtime.NODEJS_14_X,
      timeout,
      handler,
    };

    // convert bundle to bundling
    let bundling: BundlingOptions | undefined = {
      ...(baseProps as NodejsFunctionProps).bundling,
      ...props?.bundling,
    };
    if (typeof bundle === "object") {
      const { copyFiles, ...bundleRest } = cloneDeep(
        bundle
      ) as FunctionBundleObject;
      // TODO: copyfiles
      // TODO: do typesafe conversion
      bundling = { ...bundleRest, ...bundling } as any;
    }

    // copy schema.prisma by default
    if (!bundling?.commandHooks)
      bundling = {
        ...bundling,
        commandHooks: {
          beforeInstall: () => [],
          beforeBundling: () => [],
          afterBundling: (inputDir: string, outputDir: string) => {
            return [
              `cp "${inputDir}/packages/repo/prisma/schema.prisma" "${outputDir}"`,
            ];
          },
        },
      };

    return {
      ...(baseNodejsProps || {}),
      ...(props || {}),
      ...layersProp,
      ...environmentProp,
      ...permissionsProp,
      bundling,
      // ...permissionsProp,
    };
  }

  public attachPermissions(permissions: Permissions): void {
    if (this.role) {
      attachPermissionsToRole(this.role as Role, permissions);
    }
  }
}
