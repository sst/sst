// <reference path="./.sst/platform/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "worker",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
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
