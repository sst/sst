/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-email",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const address = new sst.aws.Email("EmailAddress", {
      sender: "frank@sst.dev",
    });

    const fn = new sst.aws.Function("MyApp", {
      handler: "sender.handler",
      link: [address],
      url: true,
    });

    return {
      url: fn.url,
    };
  },
});
