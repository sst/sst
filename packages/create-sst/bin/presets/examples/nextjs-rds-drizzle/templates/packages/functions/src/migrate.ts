import { ApiHandler } from "sst/node/api";
import { migrate } from "@drizzle-sst/web/drizzle";

export const handler = ApiHandler(async (_event) => {
  await migrate("migrations");
  return {
    body: "Migrations completed",
  };
});
