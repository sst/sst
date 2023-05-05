import {
  index,
  json,
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
    awsAccountID: varchar("aws_account_id", { length: 255 }).notNull(),
    region: varchar("region", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    name: uniqueIndex("name").on(table.appID, table.name, table.region),
    updated: index("updated").on(table.timeUpdated),
  })
);

export const resource = mysqlTable(
  "resource",
  {
    ...workspaceID,
    ...timestamps,
    type: varchar("type", { length: 255 }).notNull(),
    stackID: varchar("stack_id", { length: 255 }).notNull(),
    cfnID: varchar("cfn_id", { length: 255 }).notNull(),
    stageID: cuid("stage_id").notNull(),
    addr: varchar("addr", { length: 255 }).notNull(),
    data: json("data").notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
  })
);
