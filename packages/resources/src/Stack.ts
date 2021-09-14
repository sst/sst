import * as cdk from "@aws-cdk/core";
import { FunctionProps } from "./Function";
import { App } from "./App";
import { isConstruct } from "./util/construct";
import { Permissions } from "./util/permission";
import { ILayerVersion } from "@aws-cdk/aws-lambda";

export type StackProps = cdk.StackProps;

export class Stack extends cdk.Stack {
  public readonly stage: string;
  public readonly defaultFunctionProps: FunctionProps[];

  constructor(scope: cdk.Construct, id: string, props?: StackProps) {
    const root = scope.node.root as App;
    const stageId = root.logicalPrefixedName(id);

    Stack.checkForPropsIsConstruct(id, props);
    Stack.checkForEnvInProps(id, props);

    super(scope, stageId, {
      ...props,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: root.region,
      },
    });

    this.stage = root.stage;
    this.defaultFunctionProps = root.defaultFunctionProps.map((dfp) =>
      typeof dfp === "function" ? dfp(this) : dfp
    );

    this.addMetadataResource();
  }

  setDefaultFunctionProps(props: FunctionProps): void {
    if (this.node.children.length > 1)
      throw new Error(
        "Default function props for the stack must be set before any resources have been added. Use 'addDefaultFunctionEnv' or 'addDefaultFunctionPermissions' instead to add more default properties."
      );
    this.defaultFunctionProps.push(props);
  }

  addDefaultFunctionPermissions(permissions: Permissions) {
    this.defaultFunctionProps.push({
      permissions,
    });
  }

  addDefaultFunctionEnv(environment: Record<string, string>) {
    this.defaultFunctionProps.push({
      environment,
    });
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

  private addMetadataResource(): void {
    // Add a placeholder resource to ensure stacks with just an imported construct
    // has at least 1 resource, so the deployment succeeds.
    // For example: users often create a stack and use it to import a VPC. The
    //              stack does not have any resources.
    new cdk.CfnResource(this, "SSTMetadata", {
      type: "AWS::CDK::Metadata",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static checkForPropsIsConstruct(id: string, props?: any) {
    // If a construct is passed in as stack props, let's detect it and throw a
    // friendlier error.
    if (props && isConstruct(props)) {
      throw new Error(
        `Expected an associative array as the stack props while initializing "${id}" stack. Received a construct instead.`
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static checkForEnvInProps(id: string, props?: any) {
    if (props && props.env) {
      let envS = "";

      try {
        envS = " (" + JSON.stringify(props.env) + ")";
      } catch (e) {
        // Ignore
      }

      throw new Error(
        `Do not set the "env" prop while initializing "${id}" stack${envS}. Use the "AWS_PROFILE" environment variable and "--region" CLI option instead.`
      );
    }
  }
}
