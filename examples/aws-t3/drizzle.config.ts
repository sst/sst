import { Resource } from "sst";
import { type Config } from "drizzle-kit";

export default {
  driver: "aws-data-api",
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    database: Resource.MyPostgres.database,
    secretArn: Resource.MyPostgres.secretArn,
    resourceArn: Resource.MyPostgres.clusterArn,
  },
  tablesFilter: ["aws-t3_*"],
} satisfies Config;
