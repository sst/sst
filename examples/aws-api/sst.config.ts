/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## File uploads API in AWS
 *
 * A simple API built using API Gateway and Lambda. It has two routes, one generates a
 * presigned URL to upload a file to an S3 bucket and the other returns the last uploaded file.
 *
 * ```ts title="index.ts"
 * const command = new PutObjectCommand({
 *   Key: crypto.randomUUID(),
 *   Bucket: Resource.MyBucket.name,
 * });
 *
 * return {
 *   statusCode: 200,
 *   body: await getSignedUrl(s3, command),
 * };
 * ```
 *
 * This example is used in our [API quickstart](/docs/start/aws/api/).
 */
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
