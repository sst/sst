/// <reference path="./.sst/platform/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "test",
      removalPolicy: "remove",
      providers: {
        aws: {
          profile: "sst-dev",
        },
      },
    };
  },
  async run() {
    const fn = new sst.Function("MyFunction", {
      url: true,
      handler: "./src/index.handler",
    });

    return {
      url: fn.url,
    };
  },
});
