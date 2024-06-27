import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

const choice = process.env.DRIZZLE_CONFIG;
if (!choice) {
  throw new Error("DRIZZLE_CONFIG must be set");
}

console.log(Resource.Planetscale);
const configs = {
  "pg-data-api": defineConfig({
    driver: "aws-data-api",
    schema: "./src/schema/postgres.sql.ts",
    dialect: "postgresql",
    dbCredentials: {
      database: Resource.Postgres.database,
      resourceArn: Resource.Postgres.clusterArn,
      secretArn: Resource.Postgres.secretArn,
    },
  }),
  planetscale: defineConfig({
    dialect: "mysql",
    schema: "./src/schema/mysql.sql.ts",
    dbCredentials: {
      url: `mysql://${Resource.Planetscale.username}:${Resource.Planetscale.password}@${Resource.Planetscale.host}/${Resource.Planetscale.database}`,
    },
  }),
};

const match = configs[choice];
if (!match) {
  throw new Error(`Unknown DRIZZLE_CONFIG: ${choice}`);
}

export default match;
