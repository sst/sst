import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";

import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Lambda function
    new sst.Function(this, "MyLambda", {
      bundle: true,
      entry: "lambda.js",
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(10),
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
