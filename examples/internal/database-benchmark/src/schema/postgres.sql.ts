import { pgTable, smallserial, text, timestamp } from "drizzle-orm/pg-core";

export const todoTable = pgTable("todo", {
  id: smallserial("id").primaryKey(),
  title: text("title"),
  description: text("description"),
  timeCreated: timestamp("time_created").notNull().defaultNow(),
  timeCompleted: timestamp("time_completed"),
});
