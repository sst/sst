import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  // set id type to number instead of string
  constructor(scope: sst.App, id: number, props?: sst.StackProps) {
    super(scope, id, props);

    new sst.Function(this, "Lambda", {
      handler: "lambda.handler",
    });
  }
}

export default function main(app: sst.App): void {
  new MySampleStack(app, "sample");
}
