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
    const email = new sst.aws.Email("MyEmail", {
      sender: "email@example.com",
    });

    const api = new sst.aws.Function("MyApi", {
      handler: "sender.handler",
      link: [email],
      url: true,
    });

    return {
      url: api.url,
    };
  },
});
