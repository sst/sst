import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "Lambda", {
      handler: "lambda.handler",
    });
  }
}

export default function main(app) {
  var a;
  new MySampleStack(app, "sample");
}

