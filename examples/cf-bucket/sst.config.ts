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
    const bucket = new sst.cloudflare.Bucket("MyBucket", {});
    return {
      bucket: bucket.name,
    };
  },
});
