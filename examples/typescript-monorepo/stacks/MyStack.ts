import * as sst from "@serverless-stack/resources";

export class MyStack extends sst.Stack {
  constructor(scope: sst.App, props?: sst.StackProps) {
    super(scope, "MyStack", props);

    new sst.Function(this, "Func", {
      handler: "services/sample/index.handler",
    });
  }
}
