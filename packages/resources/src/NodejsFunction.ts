import path from "path";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda-nodejs";

import { App } from "./App";

export type NodejsFunctionProps = lambda.NodejsFunctionProps;

export class NodejsFunction extends lambda.NodejsFunction {
  constructor(scope: cdk.Construct, id: string, props?: NodejsFunctionProps) {
    const root = scope.node.root as App;

    if (root.local) {
      let srcPath, srcHandler;
      if (props && props.entry) {
        const entryParts = props.entry.split("/");
        srcPath = entryParts.slice(0, -1).join("/");
        srcHandler = `${entryParts.pop()}/${props.handler || "handler"}`;
      } else {
        srcPath = __dirname;
        srcHandler = path
          .basename(__filename)
          .split(".")
          .splice(0, -1)
          .concat([id, (props && props.handler) || "handler"])
          .join(".");
      }
      super(scope, id, {
        ...props,
        entry: path.resolve(__dirname, "../lambda/stub/index.js"),
        handler: "main",
        environment: {
          SST_DEBUG_SRC_PATH: srcPath,
          SST_DEBUG_SRC_HANDLER: srcHandler,
          SST_DEBUG_ENDPOINT: root.debugEndpoint || "",
        },
      });
    } else {
      super(scope, id, props);
    }
  }
}
