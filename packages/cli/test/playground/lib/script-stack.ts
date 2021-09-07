import * as sst from "@serverless-stack/resources";

interface ScriptStackProps extends sst.StackProps {
  readonly api: sst.Api;
}

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.ScriptStackProps) {
    super(scope, id, props);

    const script = new sst.Script(this, "MyScript", {
      function: "src/lambda.main",
      params: {
        hello: "World",
        integer: 123,
        api: api.url,
      },
    });

    this.addOutputs({
      functionName: script.function.functionName,
    });
  }
}
