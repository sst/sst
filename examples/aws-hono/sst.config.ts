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
    throw new Error(
      "This is a stupid error fuck you lol fuck me ok what ever bro fine this is suepr long but cool",
    );
    return {
      api: hono.url,
    };
  },
});
