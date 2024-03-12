/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "cf-backend",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      backend: "cloudflare",
      providers: { cloudflare: {} },
    };
  },
  async run() {
    const kv = new cloudflare.WorkersKvNamespace("MyKv", {
      title: "MyKv",
      accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
    });
  },
});
