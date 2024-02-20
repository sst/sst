/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    new sst.aws.Cron("MyCron", {
      job: "src/index.handler",
      schedule: "rate(1 minute)",
    });
    new sst.aws.Bucket("MyBucket");
    new sst.aws.Function("MyFunction", {
      handler: "src/index.handler",
    });
    return {};
  },
});
