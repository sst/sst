import path from "path";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";

import { App } from "./App";
import { builder } from "./util/builder";

export type FunctionProps = lambda.FunctionProps;

export class Function extends lambda.Function {
  constructor(scope: cdk.Construct, id: string, props: FunctionProps) {
    const root = scope.node.root as App;

    // Validate NodeJS runtime
    if (
      ![
        lambda.Runtime.NODEJS,
        lambda.Runtime.NODEJS_10_X,
        lambda.Runtime.NODEJS_12_X,
        lambda.Runtime.NODEJS_4_3,
        lambda.Runtime.NODEJS_6_10,
        lambda.Runtime.NODEJS_8_10,
      ].includes(props.runtime)
    ) {
      throw new Error(
        `sst.Function does not support ${props.runtime}. Only NodeJS runtimes are currently supported.`
      );
    }

    // Validate a plain file is specified
    if (!(props.code instanceof lambda.AssetCode)) {
      throw new Error(`sst.Function only supports AssetCode type for code.`);
    }

    const code = props.code as lambda.AssetCode;

    if (root.local) {
      super(scope, id, {
        ...props,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, "../dist/stub.zip")
        ),
        handler: "index.main",
        environment: {
          ...(props.environment || {}),
          SST_DEBUG_SRC_PATH: code.path,
          SST_DEBUG_SRC_HANDLER: props.handler,
          SST_DEBUG_ENDPOINT: root.debugEndpoint || "",
        },
      });
      // func.node.defaultChild.cfnOptions.metadata = { 'sst:lambda:src': 'src/hello.handler' };
    } else {
      const builderOutput = builder({
        srcPath: code.path,
        appPath: root.appPath,
        handler: props.handler,
        buildDir: root.buildDir,
      });

      super(scope, id, {
        ...props,
        code: lambda.Code.fromAsset(builderOutput.outPath),
      });
    }
  }
}
