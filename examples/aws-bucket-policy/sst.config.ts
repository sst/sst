/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Bucket policy
 *
 * Create an S3 bucket and transform its bucket policy.
 */
export default $config({
  app(input) {
    return {
      name: "aws-bucket-policy",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      transform: {
        policy: (args) => {
          // use sst.aws.iamEdit helper function to manipulate IAM policy
          // containing Output values from components
          args.policy = sst.aws.iamEdit(args.policy, (policy) => {
            policy.Statement.push({
              Effect: "Allow",
              Principal: { Service: "ses.amazonaws.com" },
              Action: "s3:PutObject",
              Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
            });
          });
        },
      },
    });

    return {
      bucket: bucket.name,
    };
  },
});
