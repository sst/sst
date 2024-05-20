/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-hono",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
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
      environment: {
        FOO: "bar",
      },
    });

    return {
      api: hono.url,
    };
  },
});
