import * as cdk from "@aws-cdk/core";
import { App } from "./App";

export type StackProps = cdk.StackProps;

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
      let envS = "";

      try {
        envS = " (" + JSON.stringify(props.env) + ")";
      } catch (e) {
        // Ignore
      }

      throw new Error(
        `Do not directly set the environment for a stack${envS}. Use the "AWS_PROFILE" environment variable and "--region" option instead.`
      );
    }
  }
}
