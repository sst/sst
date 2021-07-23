import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "relative", {
      handler: "./lambda.handler",
    });
    new sst.Function(this, "parent", {
      handler: "../lambda-handler-relative/lambda.handler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
