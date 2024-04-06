/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudflare-d1",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const db = new sst.cloudflare.D1("MyDatabase");
    const worker = new sst.cloudflare.Worker("Worker", {
      link: [db],
      url: true,
      handler: "index.ts",
    });

    return {
      url: worker.url,
    };
  },
});
