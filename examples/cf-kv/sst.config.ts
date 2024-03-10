/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-bucket",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
        cloudflare: {
          accountId: "24beb0945bae6b37c2b147db108c6ec8",
        },
      },
    };
  },
  async run() {
    const storage = new sst.cloudflare.Kv("MyStorage");
    return {
      storage: storage.title,
    };
  },
});
