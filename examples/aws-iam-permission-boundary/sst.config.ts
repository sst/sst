/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## IAM permissions boundaries
 *
 * Use permissions boundaries to set the maximum permissions for all IAM roles that'll be
 * created in your app.
 *
 * In this example, the Function has the `s3:ListAllMyBuckets` and `sqs:ListQueues`
 * permissions. However, we create a permissions boundary that only allows `s3:ListAllMyBuckets`.
 * And we apply it to all Roles in the app using the global
 * [`$transform`](/docs/reference/global/#transform).
 *
 * As a result, the Function is only allowed to list S3 buckets. If you open the deployed URL,
 * you'll see that the SQS list call fails.
 *
 * Learn more about [AWS IAM permissions boundaries](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html).
 */
export default $config({
  app(input) {
    return {
      name: "aws-iam-permission-boundary",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    // Create a permission boundary
    const permissionsBoundary = new aws.iam.Policy("MyPermissionsBoundary", {
      policy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            actions: ["s3:ListAllMyBuckets"],
            resources: ["*"],
          },
        ],
      }).json,
    });

    // Apply the boundary to all roles
    $transform(aws.iam.Role, (args) => {
      args.permissionsBoundary = permissionsBoundary;
    });

    // The boundary automatically applies to this Function's role
    const app = new sst.aws.Function("MyApp", {
      handler: "index.handler",
      permissions: [
        {
          actions: ["s3:ListAllMyBuckets", "sqs:ListQueues"],
          resources: ["*"],
        },
      ],
      url: true,
    });

    return {
      app: app.url,
    };
  },
});
