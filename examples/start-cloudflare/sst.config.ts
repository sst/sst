/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "start-cloudflare",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const bucket = new sst.cloudflare.Bucket("MyBucket");
    const worker = new sst.cloudflare.Worker("MyWorker", {
      handler: "./index.ts",
      link: [bucket],
      url: true,
    });

    return {
      url: worker.url,
    };
  },
});
