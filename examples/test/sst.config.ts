/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      backend: "aws",
      providers: {
        aws: {
          region: "us-west-1",
        },
      },
    };
  },
  async run() {
    const fn = new sst.aws.Function("SomeFunction", {
      handler: "src/index.handler",
      url: true,
    });
    const router = new sst.aws.Router("MyRouter", {
      routes: {
        "/*": fn.url,
      },
    });
    return {
      url: fn.url,
      router: router.url,
    };
  },
});
