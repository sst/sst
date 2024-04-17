/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudflare-trpc",
      home: "cloudflare",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const bucket = new sst.cloudflare.Bucket("MyBucket");
    const trpc = new sst.cloudflare.Worker("Trpc", {
      url: true,
      link: [bucket],
      handler: "index.ts",
    });

    return {
      api: trpc.url,
    };
  },
});
