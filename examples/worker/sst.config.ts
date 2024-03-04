// <reference path="./.sst/platform/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "worker",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        cloudflare: {
          accountId: "15d29c8639fd3733b1b5486a2acfd968",
        },
      },
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket");
    const worker = new sst.cloudflare.Worker("MyApp", {
      handler: "src/index.ts",
      link: [bucket],
      url: true,
    });

    return { app: worker.url };
  },
});
