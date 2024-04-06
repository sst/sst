import { defineConfig } from "drizzle-kit";

export default defineConfig({
  strict: true,
  verbose: true,
  out: "./migrations/",
  schema: "./src/**/*.sql.ts",
  driver: "d1",
});
