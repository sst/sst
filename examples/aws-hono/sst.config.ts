/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-hono",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          profile: input.stage === "production" ? "sst-production" : "sst-dev",
        },
      },
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    const hono = new sst.aws.Function("Hono", {
      url: true,
      link: [bucket],
      handler: "index.handler",
      nodejs: {
        plugins: "./plugins.mjs",
      },
    });
    return {
      api: hono.url,
    };
  },
});
