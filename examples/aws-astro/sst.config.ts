/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Astro site in AWS
 *
 * Deploys an Astro site and an S3 bucket for file uploads to AWS. It generates a presigned URL
 * to upload files to the bucket.
 *
 * ```astro title="src/pages/index.astro"
 * const command = new PutObjectCommand({
 *   Key: crypto.randomUUID(),
 *   Bucket: Resource.MyBucket.name,
 * });
 *
 * const url = await getSignedUrl(new S3Client({}), command);
 * ```
 *
 * This example is used in our [Astro quickstart](/docs/start/aws/astro/).
 */
export default $config({
  app(input) {
    return {
      name: "aws-astro",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    new sst.aws.Astro("MyWeb", {
      link: [bucket],
    });
  },
});
