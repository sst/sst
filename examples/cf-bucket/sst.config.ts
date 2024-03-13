/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-bucket",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
      backend: "aws",
    };
  },
  async run() {
    const bucket = new sst.cloudflare.Bucket("MyBucket", {});
    return {
      bucket: bucket.name,
    };
  },
});
