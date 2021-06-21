import * as cdk from "@aws-cdk/core";
import { App } from "./App";

export type StackProps = cdk.StackProps;

export class Stack extends cdk.Stack {
  public readonly stage: string;

  constructor(scope: cdk.Construct, id: string, props?: StackProps) {
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

    this.stage = root.stage;
  }

  public addOutputs(outputs: {
    [key: string]: string | cdk.CfnOutputProps;
  }): void {
    Object.keys(outputs).forEach((key) => {
      const value = outputs[key];
      if (value === undefined) {
        throw new Error(`The stack output "${key}" is undefined`);
      } else if (typeof value === "string") {
        new cdk.CfnOutput(this, key, { value });
      } else {
        new cdk.CfnOutput(this, key, value);
      }
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
