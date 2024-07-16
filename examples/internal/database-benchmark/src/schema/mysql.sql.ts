import { int, mysqlTable, text, timestamp } from "drizzle-orm/mysql-core";

export const todoTable = mysqlTable("todo", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title"),
  description: text("description"),
  timeCreated: timestamp("time_created").notNull().defaultNow(),
  timeCompleted: timestamp("time_completed"),
});
