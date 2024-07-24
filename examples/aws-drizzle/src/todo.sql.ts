import { relations } from "drizzle-orm";
import { text, pgTable, uuid } from "drizzle-orm/pg-core";

export const todo = pgTable("todo", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
});

export const todoRelations = relations(todo, (ctx) => ({
  user: ctx.many(todoUser),
}));

export const user = pgTable("user", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
});

export const userRelations = relations(user, (ctx) => ({
  todos: ctx.many(todoUser),
}));

export const todoUser = pgTable("todo_user", {
  todoId: uuid("todo_id").references(() => todo.id),
  userId: uuid("user_id").references(() => user.id),
});

export const todoToGroupRelations = relations(todoUser, (ctx) => ({
  todo: ctx.one(todo, {
    fields: [todoUser.todoId],
    references: [todo.id],
  }),
  user: ctx.one(user, {
    fields: [todoUser.userId],
    references: [user.id],
  }),
}));
