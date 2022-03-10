import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Lambda function
    new sst.Function(this, "MyLambda", {
      bundle: true,
      handler: "lambda.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: 10,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
