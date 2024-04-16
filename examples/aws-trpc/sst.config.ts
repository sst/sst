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

    const trpc = new sst.aws.Function("TRPC", {
      url: true,
      link: [bucket],
      handler: "index.handler",
    });

    const client = new sst.aws.Function("Client", {
      url: true,
      link: [trpc],
      handler: "client.handler",
    });

    return {
      api: trpc.url,
      client: client.url,
    };
  },
});
