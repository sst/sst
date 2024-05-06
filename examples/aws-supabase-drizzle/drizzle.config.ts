import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";
export default defineConfig({
  schema: ["./src/**/*.sql.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: Resource.Database.host,
    database: Resource.Database.database,
    port: Resource.Database.port,
    user: Resource.Database.user,
    password: Resource.Database.password,
  },
});
