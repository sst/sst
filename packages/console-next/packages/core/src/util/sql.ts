import { MySqlTransaction, char, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Context } from "sst/context";
import { db } from "../drizzle";
import {
  PlanetScalePreparedQueryHKT,
  PlanetscaleQueryResultHKT,
} from "drizzle-orm/planetscale-serverless";

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

export type Transaction = MySqlTransaction<
  PlanetscaleQueryResultHKT,
  PlanetScalePreparedQueryHKT
>;

const TransactionContext = Context.create<Transaction>();

export function useTransaction<T>(callback: (trx: Transaction) => Promise<T>) {
  try {
    const tx = TransactionContext.use();
    return callback(tx);
  } catch {
    return db.transaction(
      async (tx) => {
        TransactionContext.provide(tx);
        return callback(tx);
      },
      {
        isolationLevel: "serializable",
      }
    );
  }
}
