/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    new sst.aws.Function("MyFunction", {
      handler: "src/lambda.handler",
    });
    return {};
  },
});
