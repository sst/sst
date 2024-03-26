/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "start-api",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    new sst.aws.ApiGatewayV2("MyApi")
      .route("GET /", {
        link: [bucket],
        handler: "index.upload",
      })
      .route("GET /latest", {
        link: [bucket],
        handler: "index.latest",
      });
  },
});
