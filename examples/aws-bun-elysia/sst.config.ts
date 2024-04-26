/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-bun-elysia",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("Bucket");
    const vpc = new sst.aws.Vpc("Vpc");
    const cluster = new sst.aws.Cluster("Cluster", {
      vpc,
    });
    cluster.addService("Bun", {
      link: [bucket],
      public: {
        ports: [{ listen: "80/http", forward: "3000/http" }],
      },
    });
  },
});
