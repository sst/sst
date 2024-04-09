/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Astro site in AWS
 *
 * Deploys an Astro site and an S3 bucket for file uploads to AWS. It generates a presigned URL.
 * 
 *
 * This example is used in our [API quickstart](/docs/start/api/).
 */
export default $config({
  app(input) {
    return {
      name: "start-astro",
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
