import { char, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export { createId } from "@paralleldrive/cuid2";
export const cuid = (name: string) => char(name, { length: 24 });
export const id = {
  id: cuid("id").notNull(),
};

export const timestamps = {
  timeCreated: timestamp("time_created")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  timeUpdated: timestamp("time_updated")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
  timeDeleted: timestamp("time_deleted"),
};
