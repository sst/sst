import path from "path";
import { Construct } from 'constructs';
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App } from "./App";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface ScriptProps {
  readonly onCreate?: FunctionDefinition;
  readonly onUpdate?: FunctionDefinition;
  readonly onDelete?: FunctionDefinition;
  readonly params?: { [key: string]: any };
  readonly defaultFunctionProps?: FunctionProps;
}

export class Script extends Construct {
  public readonly createFunction?: Fn;
  public readonly updateFunction?: Fn;
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
        this.props.defaultFunctionProps,
        `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define the "${type}" function using FunctionProps, so the Script construct can apply the "defaultFunctionProps" to them.`
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
          ...this.props.defaultFunctionProps,
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
        ...this.props.defaultFunctionProps,
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
