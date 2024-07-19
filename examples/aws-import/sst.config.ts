/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-import",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new aws.s3.BucketV2(
      "MyBucket",
      {
        bucket: "aws-import-my-bucket",
      },
      {
        retainOnDelete: true,
        import: "aws-import-my-bucket",
      },
    );
  },
});
