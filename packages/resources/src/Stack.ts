import * as path from "path";
import * as fs from "fs-extra";
import { Construct, IConstruct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { FunctionProps, Function as Fn } from "./Function";
import { App } from "./App";
import { isConstruct } from "./Construct";
import { Permissions } from "./util/permission";

export type StackProps = cdk.StackProps;

export class Stack extends cdk.Stack {
  public readonly stage: string;
  public readonly defaultFunctionProps: FunctionProps[];
  private readonly metadata: cdk.CfnResource;

  constructor(scope: Construct, id: string, props?: StackProps) {
    const root = scope.node.root as App;
    const stackId = root.logicalPrefixedName(id);

    Stack.checkForPropsIsConstruct(id, props);
    Stack.checkForEnvInProps(id, props);

    super(scope, stackId, {
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

    this.metadata = this.createMetadataResource();
  }

  public setDefaultFunctionProps(props: FunctionProps): void {
    const fns = this.getAllFunctions();
    if (fns.length > 0)
      throw new Error(
        "Default function props for the stack must be set before any functions have been added. Use 'addDefaultFunctionEnv' or 'addDefaultFunctionPermissions' instead to add more default properties."
      );
    this.defaultFunctionProps.push(props);
  }

  public addDefaultFunctionPermissions(permissions: Permissions) {
    this.defaultFunctionProps.push({
      permissions,
    });
  }

  public addDefaultFunctionEnv(environment: Record<string, string>) {
    this.defaultFunctionProps.push({
      environment,
    });
  }

  public addDefaultFunctionLayers(layers: lambda.ILayerVersion[]) {
    this.defaultFunctionProps.push({
      layers,
    });
  }

  public getAllFunctions() {
    return this.doGetAllFunctions(this);
  }

  private doGetAllFunctions(construct: IConstruct) {
    const results: Fn[] = [];
    for (const child of construct.node.children) {
      if (child instanceof Fn) results.push(child);
      results.push(...this.doGetAllFunctions(child));
    }
    return results;
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

  public addConstructsMetadata(metadata: any): void {
    this.metadata.addMetadata("sst:constructs", metadata);
  }

  private createMetadataResource(): cdk.CfnResource {
    // Add a placeholder resource to ensure stacks with just an imported construct
    // has at least 1 resource, so the deployment succeeds.
    // For example: users often create a stack and use it to import a VPC. The
    //              stack does not have any resources.
    const res = new cdk.CfnResource(this, "SSTMetadata", {
      type: "AWS::CDK::Metadata",
    });

    // Add verison metadata
    const packageJson = fs.readJsonSync(
      path.join(__dirname, "..", "package.json")
    );
    res.addMetadata("sst:version", packageJson.version);

    return res;
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
