import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // esbuild error
    //new ApiStack(app, "api

    // esbuild warning
    //const a = -0 === t && 1 / t == -1 / 0;

    // TypeCheck error
    //a
    //b

    // Lint error
    //if (true) { }

    // Synth error
    //this.addOutputs({
    //  "@#(": "hello",
    //});

    // Deploy error
    new sst.Function(this, "fn", {
      //memorySize: 5555555,
      handler: "src/error/lambda1.main",
    });
    new sst.Function(this, "fn2", {
      runtime: "dotnetcore3.1",
      srcPath: "src/csharp",
      handler: "CsharpFunction::CsharpFunction.Handlers::Handler",
    });
  }
}
