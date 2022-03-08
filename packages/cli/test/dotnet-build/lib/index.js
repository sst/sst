import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "Lambda", {
      runtime: lambda.Runtime.DOTNET_CORE_3_1,
      srcPath: "src/SampleFunction",
      handler: "SampleFunction::SampleFunction.Function::FunctionHandler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
