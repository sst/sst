/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Cloudflare KV
 *
 * This example creates a Cloudflare KV namespace and links it to a worker. Now you can use the
 * SDK to interact with the KV namespace in your worker.
 *
 */
export default $config({
  app(input) {
    return {
      name: "cloudflare-kv",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const storage = new sst.cloudflare.Kv("MyStorage");
    const worker = new sst.cloudflare.Worker("Worker", {
      url: true,
      link: [storage],
      handler: "index.ts",
    });

    return {
      url: worker.url,
    };
  },
});

