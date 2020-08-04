import * as cdk from "@aws-cdk/core";
import { App } from "./App";

export type StackProps = Omit<cdk.StackProps, "env">;

export class Stack extends cdk.Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    const root = scope.node.root as App;
    const stageId = root.logicalPrefixedName(id);

    Stack.checkForEnvInProps(props);

    super(scope, stageId, {
      ...props,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: root.region,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static checkForEnvInProps(props?: any) {
    if (props && props.env) {
      throw "Cannot specify environment for a specific Stack";
    }
  }
}
