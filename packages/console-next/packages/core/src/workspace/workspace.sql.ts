import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id, cuid } from "../util/sql";
import { business } from "../business/business.sql";

export const workspace = mysqlTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    businessID: cuid("business_id").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id),
    slug: uniqueIndex("slug").on(table.businessID, table.slug),
  })
);
