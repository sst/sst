import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "RootLambda", {
      runtime: lambda.Runtime.GO_1_X,
      handler: "src-root/main.go",
    });
    new sst.Function(this, "WithSrcPathWithFilename", {
      runtime: lambda.Runtime.GO_1_X,
      srcPath: "with-srcPath-with-filename",
      handler: "src/main.go",
    });
    new sst.Function(this, "WithSrcPathNoFilename", {
      runtime: lambda.Runtime.GO_1_X,
      srcPath: "with-srcPath-no-filename",
      handler: "src",
    });
    new sst.Function(this, "NoSrcPathWithFilename", {
      runtime: lambda.Runtime.GO_1_X,
      handler: "no-srcPath-with-filename/src/main.go",
    });
    new sst.Function(this, "NoSrcPathNoFilename", {
      runtime: lambda.Runtime.GO_1_X,
      handler: "no-srcPath-no-filename/src",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
