/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-trpc",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    const hono = new sst.aws.Function("TRPC", {
      url: true,
      link: [bucket],
      handler: "index.handler",
    });

    return {
      api: hono.url,
    };
  },
});
