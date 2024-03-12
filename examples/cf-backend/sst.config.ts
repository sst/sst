/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "cf-backend",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      backend: "cloudflare",
      providers: { cloudflare: {}, github: {} },
    };
  },
  async run() {
    const account = process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID!;
    const kv = new cloudflare.WorkersKvNamespace("MyKv", {
      title: "MyKv",
      accountId: account,
    });
  },
});
