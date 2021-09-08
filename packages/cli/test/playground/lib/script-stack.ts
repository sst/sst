import * as sst from "@serverless-stack/resources";

interface ScriptStackProps extends sst.StackProps {
  readonly api: sst.Api;
}

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props: ScriptStackProps) {
    super(scope, id, props);

    const script = new sst.Script(this, "MyScript", {
      function: "src/lambda.main",
      params: {
        hello: "World",
        integer: 123,
        api: props.api.url,
      },
    });

    const script2 = new sst.Script(this, "MyScript2", {
      function: "src/lambda.main",
      params: {
        hello: "World2",
      },
    });

    script.node.addDependency(script2);

    this.addOutputs({
      functionName: script.function.functionName,
      functionName2: script2.function.functionName,
    });
  }
}
