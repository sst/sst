/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-kv",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
      backend: "aws",
    };
  },
  async run() {
    const storage = new sst.cloudflare.Kv("MyStorage");
    return {
      storage: storage.id,
    };
  },
});
