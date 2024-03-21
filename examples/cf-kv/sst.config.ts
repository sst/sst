/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-kv",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
      home: "aws",
    };
  },
  async run() {
    const storage = new sst.cloudflare.Kv("MyStorage");
    return {
      storage: storage.id,
    };
  },
});
