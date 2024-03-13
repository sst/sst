/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removal: "retain-all",
      backend: "aws",
      providers: {
        aws: {},
      },
    };
  },
  async run() {
    const fn = new sst.aws.Function("MyFunction2", {
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
