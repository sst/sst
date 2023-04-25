import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id } from "../util/sql";

export const business = mysqlTable(
  "business",
  {
    ...id,
    ...timestamps,
    namespace: varchar("namespace", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id),
    namespace: uniqueIndex("namespace").on(table.namespace),
  })
);

// name: StatMuse
// namespace: statmuse
