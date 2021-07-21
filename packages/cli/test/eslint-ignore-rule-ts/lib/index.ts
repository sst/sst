import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    new sst.Function(this, "Lambda", {
      handler: "lambda.handler",
    });
  }
}

export default function main(app: sst.App): void {
  let a;
  new MySampleStack(app, "sample");
}
