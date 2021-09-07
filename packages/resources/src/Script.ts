import path from "path";
import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import { App } from "./App";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface ScriptProps {
  readonly function: FunctionDefinition;
  readonly params?: { [key: string]: any }; 
}

export class Script extends cdk.Construct {
  public readonly function: Fn;
  private readonly props: ScriptProps;

  constructor(scope: cdk.Construct, id: string, props: ScriptProps) {
    super(scope, id);

    const root = scope.node.root as App;
    this.props = props;

    this.function = this.createUserFunction();
    const crFunction = this.createCustomResourceFunction();
    this.createCustomResource(root, crFunction);
  }

  public attachPermissions(permissions: Permissions): void {
    this.function.attachPermissions(permissions);
  }

  private createUserFunction(): Fn {
    if (!this.props.function) {
      throw new Error(`No function defined for the "${this.node.id}" Script`);
    }

    // function is construct => return function directly
    if (this.props.function instanceof Fn) {
      // validate live dev is not enabled
      if (this.props.function._isLiveDevEnabled) {
        throw new Error(
          `Live Lambda Dev cannot be enabled for functions in the Script construct. Set the "enableLiveDev" prop for the function to "false".`
        );
      }

      return this.props.function;
    }

    // function is string => create function
    else if (typeof this.props.function === "string") {
      return Fn.fromDefinition(this, "Function", {
        handler: this.props.function,
        timeout: 900,
        enableLiveDev: false,
      });
    }

    // function is props => create function
    return Fn.fromDefinition(this, "Function", {
      timeout: 900,
      ...this.props.function,
      enableLiveDev: false,
    });
  }

  private createCustomResourceFunction(): lambda.Function {
    const handler = new lambda.Function(this, "ScriptHandler", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "Script")
      ),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
    });
    this.function.grantInvoke(handler);

    return handler;
  }

  private createCustomResource(
    app: App,
    crFunction: lambda.Function
  ): void {
    // Note: "BuiltAt" is set to current timestamp to ensure the Custom
    //       Resource function is run on every update.
    //
    //       Do not use the current timestamp in Live mode, b/c we want the
    //       this custom resource to remain the same in CloudFormation template
    //       when rebuilding infrastructure. Otherwise, there will always be
    //       a change when rebuilding infrastructure b/c the "BuildAt" property
    //       changes on each build.
    const builtAt = app.local
      ? app.debugStartedAt
      : Date.now();
    new cdk.CustomResource(this, "ScriptResource", {
      serviceToken: crFunction.functionArn,
      resourceType: "Custom::SSTScript",
      properties: {
        UserFunction: this.function.functionName,
        UserParams: JSON.stringify(this.props.params || {}),
        BuiltAt: builtAt,
      },
    });
  }
}
