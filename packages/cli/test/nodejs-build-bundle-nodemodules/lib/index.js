import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "MyLambda1", {
      bundle: {
        nodeModules: ["mirrarray"],
      },
      handler: "lambda.handler",
    });

    new sst.Function(this, "MyLambda2", {
      bundle: {
        nodeModules: ["mirrarray"],
      },
      srcPath: "src",
      handler: "lambda.handler",
    });

    new sst.Function(this, "MyLambda3", {
      bundle: {
        nodeModules: ["mirrarray"],
      },
      srcPath: "src",
      handler: "lambda2.handler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
