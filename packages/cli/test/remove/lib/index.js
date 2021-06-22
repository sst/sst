import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    console.log(`app.skipBuild=${scope.skipBuild}`);

    new sst.Function(this, "MyFunction", {
      handler: "src/lambda.main",
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
