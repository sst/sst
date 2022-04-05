import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Lambda function
    new sst.Function(this, "MyLambda", {
      bundle: true,
      handler: "lambda.handler",
      runtime: "nodejs14.x",
      timeout: 10,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
