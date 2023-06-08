import fs from "fs";
import url from "url";
import * as path from "path";
import { Construct, IConstruct } from "constructs";
import {
  StackProps as CDKStackProps,
  Stack as CDKStack,
  CfnOutputProps,
  CfnOutput,
  Duration as CDKDuration,
  DefaultStackSynthesizer,
} from "aws-cdk-lib/core";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { useProject } from "../project.js";
import { FunctionProps, Function as Fn } from "./Function.js";
import type { App } from "./App.js";
import { isConstruct, SSTConstruct } from "./Construct.js";
import { Permissions } from "./util/permission.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export type StackProps = CDKStackProps;

/**
 * The Stack construct extends cdk.Stack. It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensure that the stack uses the same AWS profile and region as the app. They're defined using functions that return resources that can be imported by other stacks.
 *
 * @example
 *
 * ```js
 * import { StackContext } from "sst/constructs";
 *
 * export function MyStack({ stack }: StackContext) {
 *   // Define your stack
 * }
 * ```
 */
export class Stack extends CDKStack {
  /**
   * The current stage of the stack.
   */
  public readonly stage: string;

  /**
   * @internal
   */
  public readonly defaultFunctionProps: FunctionProps[];

  /**
   * Create a custom resource handler per stack. This handler will
   * be used by all the custom resources in the stack.
   * @internal
   */
  public readonly customResourceHandler: lambda.Function;

  /**
   * Skip building Function/Site code when stack is not active
   * ie. `sst remove` and `sst deploy PATTERN` (pattern not matched)
   * @internal
   */
  public readonly isActive: boolean;

  constructor(scope: Construct, id: string, props?: StackProps) {
    const app = scope.node.root as App;
    const stackId = app.logicalPrefixedName(id);

    Stack.checkForPropsIsConstruct(id, props);
    Stack.checkForEnvInProps(id, props);

    super(scope, stackId, {
      ...props,
      env: {
        account: app.account,
        region: app.region,
      },
      synthesizer: props?.synthesizer || Stack.buildSynthesizer(),
    });

    this.stage = app.stage;
    this.defaultFunctionProps = app.defaultFunctionProps.map((dfp) =>
      typeof dfp === "function" ? dfp(this) : dfp
    );
    this.customResourceHandler = this.createCustomResourceHandler();
    this.isActive =
      app.mode !== "remove" &&
      (!app.isActiveStack || app.isActiveStack?.(this.stackName) === true);
  }

  /**
   * The default function props to be applied to all the Lambda functions in the stack.
   *
   * @example
   * ```js
   * stack.setDefaultFunctionProps({
   *   srcPath: "backend",
   *   runtime: "nodejs18.x",
   * });
   * ```
   */
  public setDefaultFunctionProps(props: FunctionProps): void {
    const fns = this.getAllFunctions();
    if (fns.length > 0)
      throw new Error(
        "Default function props for the stack must be set before any functions have been added. Use 'addDefaultFunctionEnv' or 'addDefaultFunctionPermissions' instead to add more default properties."
      );
    this.defaultFunctionProps.push(props);
  }

  /**
   * Adds additional default Permissions to be applied to all Lambda functions in the stack.
   *
   * @example
   * ```js
   * stack.addDefaultFunctionPermissions(["sqs", "s3"]);
   * ```
   */
  public addDefaultFunctionPermissions(permissions: Permissions) {
    this.defaultFunctionProps.push({
      permissions,
    });
  }

  /**
   * Adds additional default environment variables to be applied to all Lambda functions in the stack.
   *
   * @example
   * ```js
   * stack.addDefaultFunctionEnv({
   *   DYNAMO_TABLE: table.name
   * });
   * ```
   */
  public addDefaultFunctionEnv(environment: Record<string, string>) {
    this.defaultFunctionProps.push({
      environment,
    });
  }

  /**
   * Binds additional resources to be applied to all Lambda functions in the stack.
   *
   * @example
   * ```js
   * app.addDefaultFunctionBinding([STRIPE_KEY, bucket]);
   * ```
   */
  public addDefaultFunctionBinding(bind: SSTConstruct[]) {
    this.defaultFunctionProps.push({ bind });
  }

  /**
   * Adds additional default layers to be applied to all Lambda functions in the stack.
   *
   * @example
   * ```js
   * stack.addDefaultFunctionLayers(["arn:aws:lambda:us-east-1:123456789012:layer:nodejs:3"]);
   * ```
   */
  public addDefaultFunctionLayers(layers: lambda.ILayerVersion[]) {
    this.defaultFunctionProps.push({
      layers,
    });
  }

  /**
   * Returns all the Function instances in this stack.
   *
   * @example
   * ```js
   * stack.getAllFunctions();
   * ```
   */
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

  /**
   * Add outputs to this stack
   *
   * @example
   * ```js
   * stack.addOutputs({
   *   TableName: table.name,
   * });
   * ```
   *
   * ```js
   * stack.addOutputs({
   *   TableName: {
   *     value: table.name,
   *     exportName: "MyTableName",
   *   }
   * });
   * ```
   */
  public addOutputs(
    outputs: Record<string, string | CfnOutputProps | undefined>
  ): void {
    Object.entries(outputs)
      .filter((e): e is [string, string | CfnOutputProps] => e[1] !== undefined)
      .forEach(([key, value]) => {
        // Note: add "SSTStackOutput" prefix to the CfnOutput id to ensure the id
        //       does not thrash w/ construct ids in the stack. So users can do this:
        //       ```
        //       const table = new Table(stack, "myTable");
        //       stack.addOutputs({ myTable: table.name });
        //       ```
        //       And then we override the logical id so the actual output name is
        //       still "myTable".
        const output =
          typeof value === "string"
            ? new CfnOutput(this, `SSTStackOutput${key}`, { value })
            : new CfnOutput(this, `SSTStackOutput${key}`, value);
        // CloudFormation only allows alphanumeric characters in the output name.
        output.overrideLogicalId(key.replace(/[^A-Za-z0-9]/g, ""));
      });
  }

  private createCustomResourceHandler() {
    const dir = path.join(__dirname, "../support/custom-resources/");
    return new lambda.Function(this, "CustomResourceHandler", {
      code: lambda.Code.fromAsset(dir, {
        //assetHash: this.stackName + "-custom-resources-20230130",
        assetHash:
          this.stackName + fs.readFileSync(dir + "/index.mjs").toString(),
      }),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: CDKDuration.seconds(900),
      memorySize: 1024,
    });
  }

  private static buildSynthesizer() {
    const config = useProject().config;
    const customSynethesizerKeys = Object.keys(config.cdk || {}).filter((key) =>
      key.startsWith("qualifier")
    );
    if (customSynethesizerKeys.length === 0) {
      return;
    }

    return new DefaultStackSynthesizer({
      qualifier: config.cdk?.qualifier,
      fileAssetsBucketName: config.cdk?.fileAssetsBucketName,
      deployRoleArn: config.cdk?.deployRoleArn,
      fileAssetPublishingRoleArn: config.cdk?.fileAssetPublishingRoleArn,
      imageAssetPublishingRoleArn: config.cdk?.imageAssetPublishingRoleArn,
      cloudFormationExecutionRole: config.cdk?.cloudFormationExecutionRole,
      lookupRoleArn: config.cdk?.lookupRoleArn,
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
