/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      providers: {
        aws: {},
      },
    };
  },
  async run() {
    const fn = new sst.aws.Function("MyFunction", {
      handler: "src/index.handler",
      url: true,
    });
    const bucket = new aws.s3.Bucket("MyBucket", { bucket: "foo" });
    return {
      url: fn.url,
    };
  },
});
