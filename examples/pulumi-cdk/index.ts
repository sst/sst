import * as pulumi from "@pulumi/pulumi";
import * as pulumicdk from "@pulumi/cdk";
import { Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

class MyStack extends pulumicdk.Stack {
  public fn: lambda.Function;
  public url: lambda.FunctionUrl;
  constructor(id: string, options?: pulumicdk.StackOptions) {
    super(id, options);

    this.fn = new lambda.Function(this, "lambda", {
      code: new lambda.InlineCode(
        "module.exports.main = () => JSON.stringify({ statusCode:200, body:'hello'});"
      ),
      handler: "index.main",
      timeout: Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_18_X,
    });
    this.url = this.fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Finalize the stack and deploy its resources.
    this.synth();
  }
}

const stack = new MyStack("my-stack");

export const apiURL = pulumi.interpolate`https://${stack.url.url}`;
