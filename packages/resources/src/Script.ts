import path from "path";
import url from "url";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App } from "./App.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionDefinition,
} from "./Function.js";
import { Permissions } from "./util/permission.js";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface ScriptProps {
  /**
   * An object of input parameters to be passed to the script. Made available in the `event` object of the function.
   *
   * @example
   * ```js
   * import { Script } from "@serverless-stack/resources";
   *
   * new Script(stack, "Script", {
   *   onCreate: "src/script.create",
   *   params: {
   *     hello: "world",
   *   },
   * });
   * ```
   */
  params?: Record<string, any>;
  defaults?: {
    /**
     * The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
     *
     * @example
     * ```js
     * new Script(stack, "Api", {
     *   defaults: {
     *     function: {
     *       timeout: 20,
     *     }
     *   }
     * });
     * ```
     */
    function?: FunctionProps;
  };
  /**
   * Creates the function that runs when the Script is created.
   *
   * @example
   * ```js
   * new Script(stack, "Api", {
   *   onCreate: "src/function.handler",
   * })
   * ```
   */
  onCreate?: FunctionDefinition;
  /**
   * Creates the function that runs on every deploy after the Script is created
   *
   * @example
   * ```js
   * new Script(stack, "Api", {
   *   onUpdate: "src/function.handler",
   * })
   * ```
   */
  onUpdate?: FunctionDefinition;
  /**
   * Create the function that runs when the Script is deleted from the stack.
   *
   * @example
   * ```js
   * new Script(stack, "Api", {
   *   onDelete: "src/function.handler",
   * })
   * ```
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
 * - [Live Lambda Dev](/live-lambda-development.md) is not enabled for these functions.
 *
 * @example
 * ### Minimal config
 *
 * ```js
 * import { Script } from "@serverless-stack/resources";
 *
 * new Script(stack, "Script", {
 *   onCreate: "src/function.create",
 *   onUpdate: "src/function.update",
 *   onDelete: "src/function.delete",
 * });
 * ```
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
    if ((props as any).function) this.checkDeprecatedFunction();

    // Validate deprecated "function" prop

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
   *
   * @example
   * ```js
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
      runtime: lambda.Runtime.NODEJS_16_X,
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
      `The "function" property has been replaced by "onCreate" and "onUpdate". More details on upgrading - https://docs.sst.dev/constructs/Script#upgrading-to-v0460`
    );
  }
}
