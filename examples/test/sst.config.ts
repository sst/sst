/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    const fn = new sst.aws.Function("MyFunction", {
      url: true,
      handler: "./src/index.handler",
      environment: {
        HELLO: "NICE",
      },
    });

    const bucket: aws.s3.Bucket = new aws.s3.Bucket("MyBucket");

    return {
      url: fn.url,
    };
  },
});
