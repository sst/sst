/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Simple API in AWS
 *
 * A simple API built using API Gateway and Lambda. It has two routes, one generates a
 * presigned URL to upload a file to an S3 bucket and the other returns the last uploaded file.
 *
 * This example is used in our [API quickstart](/docs/start/api/).
 */
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
    const api = new sst.aws.ApiGatewayV2("MyApi");
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
