/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "test",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: { "@upstash/pulumi": true },
    };
  },
  async run() {
    new upstash.RedisDatabase("MyDatabase", {
      region: "us-east-1",
      databaseName: "my-database",
    })
    const bucket = new sst.aws.Bucket("MyBucket");
    const api = new sst.aws.ApiGatewayV2("MyApi").route("GET /", {
      link: [bucket],
      handler: "src/index.handler",
    });
  },
});
