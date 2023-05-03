import {
  index,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, id, workspaceID, cuid } from "../util/sql";

export const app = mysqlTable(
  "app",
  {
    ...workspaceID,
    ...timestamps,
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    name: uniqueIndex("name").on(table.workspaceID, table.name),
    updated: index("updated").on(table.timeUpdated),
  })
);

export const stage = mysqlTable(
  "stage",
  {
    ...workspaceID,
    ...timestamps,
    appID: cuid("app_id").notNull(),
    awsAccountID: cuid("aws_account_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    name: uniqueIndex("name").on(table.appID, table.name),
    updated: index("updated").on(table.timeUpdated),
  })
);
