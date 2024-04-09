/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Remix app in AWS
 *
 * Deploys an Remix app and an S3 bucket for file uploads to AWS. It generates a presigned URL
 * to upload files to the bucket.
 *
 * ```ts title="app/routes/_index.tsx"
 * const command = new PutObjectCommand({
 *   Key: crypto.randomUUID(),
 *   Bucket: Resource.MyBucket.name,
 * });
 * const url = await getSignedUrl(new S3Client({}), command);
 * ```
 *
 * This example is used in our [Remix quickstart](/docs/start/remix/).
 */
export default $config({
  app(input) {
    return {
      name: "start-remix",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    new sst.aws.Remix("MyWeb", {
      link: [bucket],
    });
  },
});
