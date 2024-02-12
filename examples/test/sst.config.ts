/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    const queue = new sst.aws.Bucket("Bucket");
    const fn = new sst.aws.Function("MyFunction", {
      url: true,
      link: [queue],
      handler: "./src/index.handler",
      environment: {
        HELLO: "NICE",
      },
    });

    return {
      url: fn.url,
    };
  },
});
