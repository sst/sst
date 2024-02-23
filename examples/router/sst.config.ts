/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "router",
      providers: {
        aws: {},
      },
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const api = new sst.aws.Function("MyApi", {
      handler: "api.handler",
      url: true,
    });
    const router = new sst.aws.Router("MyRouter", {
      routes: {
        "/*": api.url,
      },
    });

    return {
      api: api.url,
      router: router.url,
    };
  },
});
