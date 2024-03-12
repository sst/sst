/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-backend",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        cloudflare: {
          accountId: "15d29c8639fd3733b1b5486a2acfd968",
        },
      },
    };
  },
  async run() {
    const kv = new cloudflare.WorkersKvNamespace("MyKv", {
      title: "MyKv",
      accountId: $app.providers!.cloudflare.accountId,
    });
  },
});
