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

    const api = new sst.aws.ApiGatewayV2("MyApi").route("GET /", {
      link: [bucket],
      dev: false,
      handler: "src/index.handler",
    });
  },
});
