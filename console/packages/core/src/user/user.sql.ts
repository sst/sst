import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { cuid, id, timestamps } from "../util/sql";

export const user = mysqlTable(
  "user",
  {
    ...id,
    workspaceID: cuid("workspace_id").notNull(),
    ...timestamps,
    email: varchar("email", { length: 255 }).notNull(),
  },
  (user) => ({
    primary: primaryKey(user.id, user.workspaceID),
    email: uniqueIndex("email").on(user.email, user.workspaceID),
  })
);
