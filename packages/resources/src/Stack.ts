import url from "url";
import * as path from "path";
import { Construct, IConstruct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { getSstVersion } from "@serverless-stack/core";

import { FunctionProps, Function as Fn } from "./Function.js";
import { App } from "./App.js";
import * as Config from "./Config.js";
import { isConstruct, SSTConstruct } from "./Construct.js";
import { Permissions } from "./util/permission.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export type StackProps = cdk.StackProps;

/**
 * The Stack construct extends cdk.Stack. It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensure that the stack uses the same AWS profile and region as the app. They're defined using functions that return resources that can be imported by other stacks.
 *
 * @example
 *
 * ```js
 * import { StackContext } from "@serverless-stack/resources";
 *
 * export function MyStack({ stack }: StackContext) {
 *   // Define your stack
 * }
 * ```
 */
export class Stack extends cdk.Stack {
  /**
   * The current stage of the stack.
   */
  public readonly stage: string;

  /**
   * @internal
   */
  public readonly defaultFunctionProps: FunctionProps[];

  /**
   * @internal
   */
  public readonly customResourceHandler: lambda.Function;
  private readonly metadata: cdk.CustomResource;

  constructor(scope: Construct, id: string, props?: StackProps) {
    const root = scope.node.root as App;
    const stackId = root.logicalPrefixedName(id);

    Stack.checkForPropsIsConstruct(id, props);
    Stack.checkForEnvInProps(id, props);

    super(scope, stackId, {
      ...props,
      env: {
        account: root.account,
        region: root.region
      }
    });

    this.stage = root.stage;
    this.defaultFunctionProps = root.defaultFunctionProps.map(dfp =>
      typeof dfp === "function" ? dfp(this) : dfp
    );

    // We created the Metadata resource first with empty metadata, and on
    // app synthesis we'll update it with the actual metadata.
    // We do this two step process because we call the "Template.fromStack"
    // method in the tests. And the call triggers an app synethsis. And we
    // end up synthesize an app multiple times. If we created the Metadata
    // resource on app synth, the tests would fail because the resource
    // would already exist.

    this.customResourceHandler = this.createCustomResourceHandler();
    this.metadata = this.createStackMetadataResource();
  }

  /**
   * The default function props to be applied to all the Lambda functions in the stack.
   *
   * @example
   * ```js
   * stack.setDefaultFunctionProps({
   *   srcPath: "backend",
   *   runtime: "nodejs16.x",
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
      permissions
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
      environment
    });
  }

  /**
   * Adds additional default config to be applied to all Lambda functions in the stack.
   *
   * @deprecated The "addDefaultFunctionConfig" method will be removed in SST v2. Pass Parameters and Secrets in through the "addDefaultFunctionBinding" function. Read more about how to upgrade here — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116
   * 
   * @example
   * ```js
   * // Change
   * stack.addDefaultFunctionConfig([STRIPE_KEY]);
   * 
   * // To
   * stack.addDefaultFunctionBinding([STRIPE_KEY]);
   * ```
   */
  public addDefaultFunctionConfig(
    config: (Config.Secret | Config.Parameter)[]
  ) {
    this.defaultFunctionProps.push({ config });
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
      layers
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
    outputs: Record<string, string | cdk.CfnOutputProps>
  ): void {
    Object.keys(outputs).forEach(key => {
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

  public setStackMetadata(metadata: any) {
    (this.metadata.node.defaultChild as cdk.CfnResource).addPropertyOverride(
      "Metadata",
      metadata
    );
  }

  private createCustomResourceHandler() {
    const app = this.node.root as App;
    return new lambda.Function(this, "CustomResourceHandler", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../dist/support/custom-resources")
      ),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(900),
      memorySize: 1024,
      initialPolicy: [
        // Required by stack metadata
        new iam.PolicyStatement({
          actions: ["s3:PutObject", "s3:DeleteObject"],
          resources: [
            `arn:aws:s3:::${app.bootstrapAssets.bucketName}/*`
          ],
        }),
        // Temporary: Add permissions to migrate SSM paths for secrets (piggybacking on the stack metadata custom resource handler)
        new iam.PolicyStatement({
          actions: ["ssm:GetParametersByPath", "ssm:PutParameter"],
          resources: [
            `arn:aws:ssm:${app.region}:${app.account}:parameter/sst/${app.name}/${app.stage}/*`,
            `arn:aws:ssm:${app.region}:${app.account}:parameter/sst/${app.name}/.fallback/*`,
          ],
        }),
        // Required by Auth
        new iam.PolicyStatement({
          actions: [
            "ssm:GetParameter",
            "ssm:PutParameter",
            "ssm:DeleteParameter",
          ],
          resources: [
            `arn:aws:ssm:${app.region}:${app.account}:parameter/*`,
          ]
        }),
      ]
    });
  }

  private createStackMetadataResource() {
    const app = this.node.root as App;
    return new cdk.CustomResource(this, "StackMetadata", {
      serviceToken: this.customResourceHandler.functionArn,
      resourceType: "Custom::StackMetadata",
      properties: {
        App: app.name,
        Stage: this.stage,
        Stack: this.stackName,
        SSTVersion: getSstVersion(),
        BootstrapBucketName: app.bootstrapAssets.bucketName!,
        ForceUpdate: process.env.SST_FORCE_UPDATE_METADATA ? Date.now().toString() : undefined,
      },
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
