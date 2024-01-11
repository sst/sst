/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "test",
      removalPolicy: "remove",
      providers: {
        aws: {
          profile: "sst-dev",
        },
        cloudflare: {
          accountId: "15d29c8639fd3733b1b5486a2acfd968",
        },
      },
    };
  },
  async run() {
    const bucket = new sst.Bucket("MyBucket");
    const secret = new sst.Secret("FOO");
    const fn = new sst.Function("MyFunction", {
      url: true,
      link: [secret],
      handler: "./src/index.handler",
    });

    return {
      url: fn.url,
    };
  },
});
