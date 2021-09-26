import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    new sst.Function(this, "MyFunction", {
      handler: "lambda.main",
      bundle: {
        esbuildConfig: "esbuild-config.js",
      },
    });

    new sst.Function(this, "MyFunction2", {
      handler: "lambda.main",
      bundle: {
        esbuildConfig: {
          plugins: "esbuild-config.js",
          keepNames: true,
        },
      },
    });
  }
}

export default function main(app: sst.App): void {
  new MySampleStack(app, "sample");
}
