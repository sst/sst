/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS EFS with SQLite
 *
 * Mount an EFS file system to a function and write to a SQLite database.
 *
 * ```js title="index.ts"
 * const db = sqlite3("/mnt/efs/mydb.sqlite");
 * ```
 *
 * The file system is mounted to `/mnt/efs` in the function.
 *
 * :::note
 * Given the performance of EFS, it's not recommended to use it for databases.
 * :::
 *
 * This example is for demonstration purposes only. It's not recommended to use
 * EFS for databases in production.
 */
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
      vpc,
      url: true,
      volume: {
        efs,
        path: "/mnt/efs",
      },
      handler: "index.handler",
      nodejs: {
        install: ["better-sqlite3"],
      },
    });
  },
});
