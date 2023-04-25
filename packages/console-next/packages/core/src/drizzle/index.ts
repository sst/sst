import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import { Config } from "sst/node/config";
import { fetch } from "undici";

const connection = connect({
  host: Config.PLANETSCALE_HOST,
  username: Config.PLANETSCALE_USERNAME,
  password: Config.PLANETSCALE_PASSWORD,
  fetch,
});

export const db = drizzle(connection);
