import * as lambda from "@aws-cdk/aws-lambda";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // Build error
    //new ApiStack(app, "api

    // TypeCheck error
    //a

    // Lint error
    //if (true) { }

    // Synth error
    //this.addOutputs({
    //  "@#(": "hello",
    //});

    // Deploy error
    new lambda.Function(this, "fn", {
      runtime: lambda.Runtime.NODEJS_4_3,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "..src/lambdajs.js")),
    });
  }
}
