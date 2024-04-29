/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-api",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    const api = new sst.aws.ApiGatewayV2("MyApi", {
      transform: {
        route: {
          handler: {
            timeout: "12 seconds",
          },
        },
      },
    });
    api.route("GET /", {
      link: [bucket],
      handler: "index.upload",
    });
    api.route("GET /latest", {
      link: [bucket],
      handler: "index.latest",
    });
  },
});
