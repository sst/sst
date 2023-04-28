import {
  mysqlTable,
  primaryKey,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, timestamps } from "../util/sql";

export const account = mysqlTable(
  "account",
  {
    ...id,
    email: varchar("email", { length: 255 }).notNull(),
    ...timestamps,
  },
  (user) => ({
    primary: primaryKey(user.id),
    email: uniqueIndex("email").on(user.email),
  })
);
