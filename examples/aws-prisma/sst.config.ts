/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Prisma in Lambda
 *
 * To use Prisma in a Lambda function you need:
 *
 * 1. [`@prisma/client`](https://www.npmjs.com/package/@prisma/client) package
 * 2. The generated Prisma client from `npx prisma generate`
 *
 * You don't need a layer to deploy these because `nodejs.install` automatically uses the
 * right binary for the target Lambda architecture.
 *
 * ```ts title="sst.config.ts"
 * {
 *   nodejs: { install: ["@prisma/client"] }
 * }
 * ```
 *
 * However, this overwrites the default client in `node_modules/.prisma/client` that's generated
 * by Prisma. So we need to use a different directory.
 *
 * ```prisma title="prisma/schema.prisma"
 * generator client {
 *   provider = "prisma-client-js"
 *   output = "../.prisma/client"
 * }
 * ```
 *
 * And then we need to copy the generated client to the function.
 *
 * ```ts title="sst.config.ts"
 * {
 *   copyFiles: [{
 *     from: ".prisma/client/"
 *   }]
 * }
 * ```
 *
 * We also need to import this client in the function.
 *
 * ```ts title="prisma.ts"
 * import { PrismaClient } from "./.prisma/client";
 * ```
 *
 * #### Prisma in serverless environments
 *
 * Prisma unfortunately is [not great in serverless environments](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#serverless-environments-faas). For a couple of reasons:
 *
 * 1. It doesn't support Data API, so you need to manage the connection pool on your own.
 * 2. Without the Data API, your functions need to run inside a VPC.
 *    - You cannot use `sst dev` without [connecting to the VPC](/docs/live#using-a-vpc).
 * 3. Due to the internal architecture of their client, it's also has slower cold starts.
 *
 * Instead we recommend using Drizzle. This example is here for reference for people that are
 * already using Prisma.
 */
export default $config({
  app(input) {
    return {
      name: "aws-prisma",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("MyVpc", { nat: "managed" });
    const rds = new sst.aws.Postgres("MyPostgres", { vpc });

    const api = new sst.aws.Function("MyApi", {
      vpc,
      url: true,
      link: [rds],
      handler: "index.handler",
      copyFiles: [{
        from: ".prisma/client/",
      }],
      nodejs: { install: ["@prisma/client"] },
    });

    return {
      api: api.url,
    };
  },
});
