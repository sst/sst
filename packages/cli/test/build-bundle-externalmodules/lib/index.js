import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "MyLambda1", {
      bundle: {
        externalModules: ["uuid"],
      },
      handler: "lambda.handler",
    });
    new sst.Function(this, "MyLambda2", {
      bundle: {
        externalModules: ["mirrarray"],
      },
      srcPath: "src",
      handler: "lambda.handler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
