/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "aws-hono",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: { "aws-native": true },
    };
  },
  async run() {
    // const bucket = new sst.aws.Bucket("MyBucket", {
    //   public: true,
    // });
    // const hono = new sst.aws.Function("Hono", {
    //   url: true,
    //   link: [bucket],
    //   handler: "index.handler",
    // });
    const role = new aws.iam.Role(
      "MyRole",
      {
        name: "test-role",
        assumeRolePolicy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "lambda.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        }),
      },
      {
        import: "test-role",
      },
    );
    return {};
  },
});
