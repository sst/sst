/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Next.js app in AWS
 *
 * Deploys an Next.js app and an S3 bucket for file uploads to AWS. It generates a presigned URL
 * to upload files to the bucket.
 *
 * ```ts title="app/page.tsx"
 * const command = new PutObjectCommand({
 *   Key: crypto.randomUUID(),
 *   Bucket: Resource.MyBucket.name,
 * });
 * const url = await getSignedUrl(new S3Client({}), command);
 * ```
 *
 * This example is used in our [Next.js quickstart](/docs/start/nextjs/).
 */
export default $config({
  app(input) {
    return {
      name: "start-nextjs",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
    });
    new sst.aws.Nextjs("MyWeb", {
      link: [bucket],
    });
  },
});
