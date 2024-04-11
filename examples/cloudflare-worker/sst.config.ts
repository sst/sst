/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## File uploads API in Cloudflare
 *
 * Deploys an API with a Cloudflare Worker, and and R2 bucket for file uploads. It takes a
 * request and uploads the file to the bucket.
 *
 * ```ts title="index.ts"
 * const key = crypto.randomUUID();
 * await Resource.MyBucket.put(key, req.body, {
 *   httpMetadata: {
 *     contentType: req.headers.get("content-type"),
 *   },
 * });
 * ```
 *
 * This example is used in our [Cloudflare quickstart](/docs/start/cloudflare/worker/).
 */
export default $config({
  app(input) {
    return {
      name: "cloudflare-worker",
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
