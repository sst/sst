/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sst-transform",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    $transform(sst.aws.Function, (args) => {
      args.runtime = "nodejs14.x";
      args.environment = {
        FOO: "BAR",
      };
    });
    new sst.aws.Function("MyFunction", {
      handler: "index.ts",
    });
  },
});
