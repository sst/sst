import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "MyLambda1", {
      bundle: {
        copyFiles: [
          { from: "fileInRoot", to: "fileInRoot" },
          { from: "dirInRoot", to: "dirInRoot" },
          { from: "src/fileInSrc", to: "src/fileInSrc" },
        ],
      },
      handler: "lambda.handler",
    });
    new sst.Function(this, "MyLambda2", {
      bundle: {
        copyFiles: [
          { from: "../fileInRoot", to: "fileInRoot" },
          { from: "../dirInRoot", to: "dirInRoot" },
          { from: "fileInSrc", to: "fileInSrc" },
        ],
      },
      srcPath: "src",
      handler: "lambda.handler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
