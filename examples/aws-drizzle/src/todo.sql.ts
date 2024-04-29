import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const todo = pgTable("todo", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
});
