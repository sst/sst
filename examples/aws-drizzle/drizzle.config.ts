import { Resource } from "sst";
import { defineConfig } from "drizzle-kit";

const cfg = Resource.MyPostgres;

export default defineConfig({
  dialect: "postgresql",
  // Pick up all our schema files
  schema: ["./src/**/*.sql.ts"],
  out: "./migrations",
  dbCredentials: {
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: cfg.database,
  },
});
