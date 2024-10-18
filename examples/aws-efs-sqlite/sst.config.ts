/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-efs-sqlite",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // NAT Gateways are required for Lambda functions
    const vpc = new sst.aws.Vpc("MyVpc", { nat: "managed" });

    // Create an EFS file system to store the SQLite database
    const efs = new sst.aws.Efs("MyEfs", { vpc });

    // Create a Lambda function that queries the database
    new sst.aws.Function("MyFunction", {
      handler: "index.handler",
      url: true,
      vpc,
      volume: {
        efs,
        path: "/mnt/efs",
      },
      nodejs: {
        install: ["better-sqlite3"],
      },
    });
  },
});
