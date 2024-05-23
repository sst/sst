/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-bus",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bus = new sst.aws.Bus("Bus");
    const fn = new sst.aws.Function("Fn", {
      handler: "./src/index.handler",
      url: true,
      link: [bus],
    });

    bus.subscribe("./src/receiver.handler");

    return {
      url: fn.url,
    };
  },
});
