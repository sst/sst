import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";
export default defineConfig({
  driver: "aws-data-api",
  dialect: "postgresql",
  dbCredentials: {
    database: Resource.Postgres.database,
    secretArn: Resource.Postgres.secretArn,
    resourceArn: Resource.Postgres.clusterArn,
  },
  schema: ["./src/**/*.sql.ts"],
  out: "./migrations",
});
