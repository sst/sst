import { bigint, char, mysqlTable } from "drizzle-orm/mysql-core";
import { timestamps, id } from "../util/sql";

export const replicache_client = mysqlTable("replicache_client", {
  id: char("id", { length: 36 }).primaryKey(),
  mutationID: bigint("mutation_id", {
    mode: "number",
  })
    .default(0)
    .notNull(),
  ...timestamps,
});
