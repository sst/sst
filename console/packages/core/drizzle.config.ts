import type { Config } from "drizzle-kit";

const connection = {
  user: process.env["SST_Secret_value_PLANETSCALE_USERNAME"],
  password: process.env["SST_Secret_value_PLANETSCALE_PASSWORD"],
  host: process.env["SST_Secret_value_PLANETSCALE_HOST"],
};
export default {
  out: "./migrations/",
  schema: "./src/**/*.sql.ts",
  connectionString: `mysql://${connection.user}:${connection.password}@${connection.host}:3306/sst?ssl={"rejectUnauthorized":true}`,
} satisfies Config;
