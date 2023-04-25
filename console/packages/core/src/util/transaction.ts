import { MySqlTransaction } from "drizzle-orm/mysql-core";
import {
  PlanetScalePreparedQueryHKT,
  PlanetscaleQueryResultHKT,
} from "drizzle-orm/planetscale-serverless";
import { Context } from "sst/context";
import { db } from "../drizzle";

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
