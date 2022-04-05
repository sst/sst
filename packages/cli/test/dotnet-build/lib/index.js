import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new sst.Function(this, "Lambda", {
      runtime: "dotnetcore3.1",
      srcPath: "src/SampleFunction",
      handler: "SampleFunction::SampleFunction.Function::FunctionHandler",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
