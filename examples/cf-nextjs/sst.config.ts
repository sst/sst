/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-nextjs",
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
    const app = new sst.cloudflare.Worker("MyApp", {
      handler: "src/index.ts",
      //link: [bucket],
      domain: {
        hostname: "next.sstion.com",
        zoneId: "415e6f4652b6d95b775d350f32119abb",
      },
      url: true,
      transform: {
        worker: {
          r2BucketBindings: [
            {
              name: "MY_BUCKET",
              bucketName: bucket.name,
            },
          ],
        },
      },
    });

    return {
      app: app.url,
      bucket: bucket.name,
    };
  },
});
