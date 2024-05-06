import { Resource } from "sst";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  driver: "aws-data-api",
  dialect: "postgresql",
  dbCredentials: {
    database: Resource.MyPostgres.database,
    secretArn: Resource.MyPostgres.secretArn,
    resourceArn: Resource.MyPostgres.clusterArn,
  },
  // Pick up all our schema files
  schema: ["./src/**/*.sql.ts"],
  out: "./migrations",
});
