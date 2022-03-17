import path from "path";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface ScriptProps {
  /**
   * An object of input parameters to be passed to the script. Made available in the `event` object of the function.
   *
   * So for example, if the `params` are:
   *
   * ``` js
   * {
   *   key: "Value"
   * }
   * ```
   *
   * Then in the function, `event.params.key` would give you `Value`.
   *
   * @example
   * ### Configuring parameters
   *
   * The `params` will be passed in as the `event` object to the function.
   *
   * ```js {12-15}
   * import { Table, Script } from "@serverless-stack/resources";
   *
   * const table = new Table(this, "Table", {
   *   fields: {
   *     userId: TableFieldType.STRING,
   *   },
   *   primaryIndex: { partitionKey: "userId" },
   * });
   *
   * new Script(this, "Script", {
   *   onCreate: "src/script.create",
   *   params: {
   *     hello: "world",
   *     tableName: table.tableName,
   *   },
   * });
   * ```
   *
   * So in the above example, the `event.params.tableName` will be available in the onCreate function in `src/script.create`.
   *
   * Note that, the value for `tableName` will be resolved at deploy time. For example, in this case, the `Table` construct will get created first, and the `Script` construct will be run afterwards. And if you were to print out the value of `event.params.tableName` inside the onCreate function, you will see the name of the table.
   */
  params?: Record<string, any>;
  /**
   * @example
   * ### Specifying function props for all the functions
   * You can extend the minimal config, to set some function props and have them apply to all the functions.
   *
   * ```js {3-7}
   * new Script(this, "Script", {
   *   defaults: {
   *     function: {
   *       timeout: 20,
   *       environment: { tableName: table.tableName },
   *       permissions: [table],
   *     },
   *   },
   *   onCreate: "src/script.create",
   * });
   * ```
   */
  defaults?: {
    /**
     * The default function props to be applied to all the lifecycle functions in the Script. If the `function` is specified for a specific lifecycle, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
     */
    function?: FunctionProps;
  };
  /**
   * Creates the function that runs when the Script is created.
   */
  onCreate?: FunctionDefinition;
  /**
   * Creates the function that runs on every deploy after the Script is created
   */
  onUpdate?: FunctionDefinition;
  /**
   * Create the function that runs when the Script is deleted from the stack.
   */
  onDelete?: FunctionDefinition;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Script` construct is a higher level CDK construct that makes it easy to run a script in a Lambda function during the deployment process. It provides a simple way to build and bundle the script function; and allows you to pass parameter values based on outputs from other constructs in your SST app. So you don't have to hard code values in your script. You can configure a script to run before or after any of the stacks or resources are deployed in your app.
 *
 * Since the script is running inside a Lambda function, it can interact with resources like the RDS databases, that are inside a VPC; and make AWS API calls to services that the IAM credentials in your local environment or CI might not have permissions to.
 *
 * A few things to note:
 * - It does not run locally. It runs inside a Lambda function.
 * - It gets run on every deployment.
 * - It can run for a maximum of 15 minutes.
 * - [Live Lambda Dev](../live-lambda-development.md) is not enabled for these functions.
 *
 * @example
 * ### Running a Script
 *
 * ```js
 * import { Script } from "@serverless-stack/resources";
 *
 * new Script(this, "Script", {
 *   onCreate: "src/script.create",
 *   onUpdate: "src/script.update",
 *   onDelete: "src/script.delete",
 * });
 * ```
 * ### Using the full config
 *
 * If you wanted to configure each Lambda function separately, you can pass in the [`FunctionProps`](Function.md#functionprops).
 *
 * ```js
 * new Script(this, "Script", {
 *   onCreate: {
 *     srcPath: "src/",
 *     handler: "script.create",
 *     environment: { tableName: table.tableName },
 *     permissions: [table],
 *   },
 * });
 * ```
 * Note that, you can set the `defaults.function` while configuring a Lambda function. The function's props will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
 *
 * ```js
 * new Script(this, "Script", {
 *   defaults: {
 *     function: {
 *       timeout: 20,
 *       environment: { tableName: table.tableName },
 *       permissions: [table],
 *     }
 *   },
 *   onCreate: {
 *     handler: "src/script.create",
 *     timeout: 10,
 *     environment: { bucketName: bucket.bucketName },
 *     permissions: [bucket],
 *   },
 *   onUpdate: "src/script.update",
 * });
 * ```
 *
 * So in the above example, the `onCreate` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.
 *
 * ### Running before deploy
 *
 * You can configure the `Script` to run at the beginning of the deployment, before any resources are deployed.
 *
 * First, create a stack for the construct. Let's call it `BeforeDeployStack` and add it to your `stacks/index.js`.
 *
 * ```js title="stacks/index.js"
 * const beforeDeployStack = new BeforeDeployStack(app, "before-deploy");
 *
 * const apiStack = new ApiStack(app, "api");
 * const dbStack = new DBStack(app, "db");
 *
 * apiStack.addDependency(beforeDeployStack);
 * dbStack.addDependency(beforeDeployStack);
 * ```
 * By making both `ApiStack` and `DBStack` depend on `BeforeDeployStack`, they will get deployed after `BeforeDeployStack` is done deploying.
 *
 * Here we are making use of the idea of [Stack dependencies](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#stack-dependencies) in CDK.
 *
 * Then, let's add the script to the `BeforeDeployStack`.
 *
 * ```js title="stacks/BeforeDeployStack.js"
 * import { Stack, Script } from "@serverless-stack/resources";
 *
 * export class BeforeDeployStack extends Stack {
 *   constructor(scope, id, props) {
 *     super(scope, id, props);
 *
 *     new Script(this, "BeforeDeploy", {
 *       onCreate: "src/script.create",
 *     });
 *   }
 * }
 * ```
 *
 * Now when you deploy this app, the `BeforeDeployStack` will get deployed first, which runs the `Script`.
 *
 * Note that, if the script fails to run, the deploy fails. And the `ApiStack` and the `DBStack` will not get deployed. In this case, you can fix the script, and deploy again.
 *
 * ### Running after deploy
 *
 * Similarly, you can configure a `Script` to run at the end of the deployment, after all resources are deployed.
 *
 * Create a `AfterDeployStack` in `stacks/index.js`.
 *
 * ```js title="stacks/index.js"
 * const apiStack = new ApiStack(app, "api");
 * const dbStack = new DBStack(app, "db");
 *
 * const afterDeployStack = new AfterDeployStack(app, "after-deploy");
 *
 * afterDeployStack.addDependency(apiStack);
 * afterDeployStack.addDependency(dbStack);
 * ```
 *
 * By making the `AfterDeployStack` depend on both `ApiStack` and `DBStack`, it will get deployed after the two stacks are done deploying.
 *
 * Here we are making use of the idea of [Stack dependencies](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#stack-dependencies) in CDK.
 *
 * Then, let's add the script in the `AfterDeployStack`.
 *
 * ```js title="stacks/AfterDeployStack.js"
 * import { Stack, Script } from "@serverless-stack/resources";
 *
 * export class AfterDeployStack extends Stack {
 *   constructor(scope, id, props) {
 *     super(scope, id, props);
 *
 *     new Script(this, "AfterDeploy", {
 *       onCreate: "src/script.create",
 *     });
 *   }
 * }
 * ```
 *
 * Now when you deploy this app, the `AfterDeployStack` will get deployed at the end and run the `Script`.
 *
 * Note that, if the script fails to run, the entire deploy is marked as failed. And the updates made to the `ApiStack` and the `DBStack` will get rolled back. In this case, you can fix the script, and deploy again.
 *
 * ### Running multiple Scripts
 *
 * Multiple scripts within the same Stack can run concurrently. You can manage the order in which they get run by specifying a dependency relationship.
 *
 * ```js {9}
 * const scriptA = new Script(this, "Script", {
 *   onCreate: "src/scriptA.create",
 * });
 *
 * const scriptB = new Script(this, "Script", {
 *   onCreate: "src/scriptB.create",
 * });
 *
 * scriptB.node.addDependency(scriptA);
 * ```
 *
 * In this case, `scriptB` will run after `scriptA` is completed.
 *
 * Here we are making use of the idea of [Construct dependencies](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#construct-dependencies) in CDK.
 *
 */
export class Script extends Construct {
  /**
   * The internally created onCreate `Function` instance.
   */
  public readonly createFunction?: Fn;
  /**
   * The internally created onUpdate `Function` instance.
   */
  public readonly updateFunction?: Fn;
  /**
   * The internally created onDelete `Function` instance.
   */
  public readonly deleteFunction?: Fn;
  protected readonly props: ScriptProps;

  constructor(scope: Construct, id: string, props: ScriptProps) {
    super(scope, id);

    // Validate deprecated "function" prop
    if ((props as any).function) this.checkDeprecatedFunction();

    // Validate at least 1 function is provided
    if (!props.onCreate && !props.onUpdate && !props.onDelete) {
      throw new Error(
        `Need to provide at least one of "onCreate", "onUpdate", or "onDelete" functions for the "${this.node.id}" Script`
      );
    }

    const root = scope.node.root as App;
    this.props = props;

    this.createFunction = this.createUserFunction("onCreate", props.onCreate);
    this.updateFunction = this.createUserFunction("onUpdate", props.onUpdate);
    this.deleteFunction = this.createUserFunction("onDelete", props.onDelete);
    const crFunction = this.createCustomResourceFunction();
    this.createCustomResource(root, crFunction);
  }

  /**
   * Grants additional permissions to the script
   * @example
   * ### Attaching permissions
   *
   * ```js {7}
   * const script = new Script(this, "Script", {
   *   onCreate: "src/script.create",
   *   onUpdate: "src/script.update",
   *   onDelete: "src/script.delete",
   * });
   *
   * script.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    this.createFunction?.attachPermissions(permissions);
    this.updateFunction?.attachPermissions(permissions);
    this.deleteFunction?.attachPermissions(permissions);
  }

  protected createUserFunction(
    type: string,
    fnDef?: FunctionDefinition
  ): Fn | undefined {
    if (!fnDef) {
      return;
    }

    // function is construct => return function directly
    if (fnDef instanceof Fn) {
      // validate live dev is not enabled
      if (fnDef._isLiveDevEnabled) {
        throw new Error(
          `Live Lambda Dev cannot be enabled for functions in the Script construct. Set the "enableLiveDev" prop for the function to "false".`
        );
      }

      return Fn.fromDefinition(
        this,
        `${type}Function`,
        fnDef,
        this.props.defaults?.function,
        `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define the "${type}" function using FunctionProps, so the Script construct can apply the "defaults.function" to them.`
      );
    }

    // function is string => create function
    else if (typeof fnDef === "string") {
      return Fn.fromDefinition(
        this,
        `${type}Function`,
        {
          handler: fnDef,
          enableLiveDev: false,
        },
        {
          timeout: 900,
          ...this.props.defaults?.function,
        }
      );
    }

    // function is props => create function
    return Fn.fromDefinition(
      this,
      `${type}Function`,
      {
        ...fnDef,
        enableLiveDev: false,
      },
      {
        timeout: 900,
        ...this.props.defaults?.function,
      }
    );
  }

  private createCustomResourceFunction(): lambda.Function {
    const handler = new lambda.Function(this, "ScriptHandler", {
      code: lambda.Code.fromAsset(path.join(__dirname, "Script")),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
    });
    this.createFunction?.grantInvoke(handler);
    this.updateFunction?.grantInvoke(handler);
    this.deleteFunction?.grantInvoke(handler);

    return handler;
  }

  private createCustomResource(app: App, crFunction: lambda.Function): void {
    // Note: "BuiltAt" is set to current timestamp to ensure the Custom
    //       Resource function is run on every update.
    //
    //       Do not use the current timestamp in Live mode, b/c we want the
    //       this custom resource to remain the same in CloudFormation template
    //       when rebuilding infrastructure. Otherwise, there will always be
    //       a change when rebuilding infrastructure b/c the "BuildAt" property
    //       changes on each build.
    const builtAt = app.local ? app.debugStartedAt : Date.now();
    new cdk.CustomResource(this, "ScriptResource", {
      serviceToken: crFunction.functionArn,
      resourceType: "Custom::SSTScript",
      properties: {
        UserCreateFunction: this.createFunction?.functionName,
        UserUpdateFunction: this.updateFunction?.functionName,
        UserDeleteFunction: this.deleteFunction?.functionName,
        UserParams: JSON.stringify(this.props.params || {}),
        BuiltAt: builtAt,
      },
    });
  }

  private checkDeprecatedFunction(): void {
    throw new Error(
      `The "function" property has been replaced by "onCreate" and "onUpdate". More details on upgrading - https://docs.serverless-stack.com/constructs/Script#upgrading-to-v0460`
    );
  }
}
