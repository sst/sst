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
          // use $jsonParse and $jsonStringify helper functions to manipulate JSON strings
          // containing Output values from components
          args.policy = $jsonParse(args.policy).apply((policy) => {
            policy.Statement.push({
              Effect: "Allow",
              Principal: { Service: "ses.amazonaws.com" },
              Action: "s3:PutObject",
              Resource: $interpolate`arn:aws:s3:::${args.bucket}/*`,
            });
            return $jsonStringify(policy);
          });
        },
      },
    });

    return {
      bucket: bucket.name,
    };
  },
});
