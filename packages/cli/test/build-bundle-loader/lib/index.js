import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "MyLambda1", {
      bundle: {
        loader: { ".data": "binary" },
      },
      handler: "lambda.handler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
