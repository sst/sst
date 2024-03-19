/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "test",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket");
    const fn = new sst.aws.Function("MyFunction", {
      handler: "src/index.handler",
    });

    const api = new sst.aws.ApiGatewayV2("MyApi").route("GET /", {
      link: [bucket],
      handler: "src/index.handler",
    });
  },
});
