import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id, cuid } from "../util/sql";

export const workspace = mysqlTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id),
  })
);
