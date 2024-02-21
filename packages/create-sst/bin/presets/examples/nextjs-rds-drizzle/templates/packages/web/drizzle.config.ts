import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  driver: "pg",
  schema: "./drizzle/schema.ts",
  out: "./migrations",
});
