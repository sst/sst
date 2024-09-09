/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## T3 Stack in AWS
 *
 * Deploy [T3 stack](https://create.t3.gg) with Drizzle and Postgres to AWS. To use this
 * example run:
 *
 * ```bash
 * npm install
 * npm run db:push
 * npx sst dev
 * ```
 *
 * And deploy it to production with.
 *
 * ```bash
 * npx sst deploy --stage production
 * ```
 *
 * This example was created using `create-t3-app` and the following options: tRPC, Drizzle,
 * no auth, Tailwind, Postgres, and the App Router
 *
 * Instead of a local database, we'll be using an RDS Postgres database and connect to it
 * with the RDS Data API.
 *
 * ```ts title="src/server/db/index.ts"
 * import { Resource } from "sst";
 * import { drizzle } from "drizzle-orm/aws-data-api/pg";
 * import { RDSDataClient } from "@aws-sdk/client-rds-data";
 * 
 * import * as schema from "./schema";
 * 
 * const client = new RDSDataClient({});
 * 
 * export const db = drizzle(client, {
 *   schema,
 *   database: Resource.MyPostgres.database,
 *   secretArn: Resource.MyPostgres.secretArn,
 *   resourceArn: Resource.MyPostgres.clusterArn,
 * });
 * ```
 *
 * In our Next.js app we can access our Postgres database because we [link them](/docs/linking/)
 * both. We don't need to use our `.env` files.
 *
 * ```ts title="sst.config.ts" {4}
 *  const rds = new sst.aws.Postgres("MyPostgres", { vpc });
 *
 *  new sst.aws.Nextjs("MyWeb", {
 *    link: [rds]
 *  });
 * ```
 *
 * For Drizzle Kit, we use the `aws-data-api` driver.
 *
 * ```ts title="drizzle.config.ts" {5}
 * import { Resource } from "sst";
 * import { type Config } from "drizzle-kit";
 * 
 * export default {
 *   driver: "aws-data-api",
 *   schema: "./src/server/db/schema.ts",
 *   dialect: "postgresql",
 *   dbCredentials: {
 *     database: Resource.MyPostgres.database,
 *     secretArn: Resource.MyPostgres.secretArn,
 *     resourceArn: Resource.MyPostgres.clusterArn,
 *   },
 *   tablesFilter: ["aws-t3_*"],
 * } satisfies Config;
 * ```
 *
 * And to make sure our credentials are available, we update our `package.json`
 * with the [`sst shell`](/docs/reference/cli) CLI.
 *
 * ```json title="package.json"
 * "db:generate": "sst shell drizzle-kit generate",
 * "db:migrate": "sst shell drizzle-kit migrate",
 * "db:push": "sst shell drizzle-kit push",
 * "db:studio": "sst shel drizzle-kit studio",
 * ```
 *
 * So running `npm run db:push` will run Drizzle Kit with the right credentials.
 */
export default $config({
  app(input) {
    return {
      name: "aws-t3",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("MyVpc");
    const rds = new sst.aws.Postgres("MyPostgres", { vpc });

    new sst.aws.Nextjs("MyWeb", {
      link: [rds]
    });
  },
});
