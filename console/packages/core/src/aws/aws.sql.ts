import {
  index,
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { timestamps, workspaceID } from "../util/sql";

export const awsAccount = mysqlTable(
  "aws_account",
  {
    ...workspaceID,
    ...timestamps,
    accountID: varchar("account_id", { length: 12 }).notNull(),
  },
  (table) => ({
    primary: primaryKey(table.id, table.workspaceID),
    accountID: uniqueIndex("account_id").on(table.workspaceID, table.accountID),
    updated: index("updated").on(table.timeUpdated),
  })
);
