/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    const role = new aws.iam.Role("MyRole", {
      name: "MyRole",
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
    });
  },
});
