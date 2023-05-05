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

const TransactionContext = Context.create<{
  tx: Transaction;
  effects: (() => void | Promise<void>)[];
}>();

export function useTransaction<T>(callback: (trx: Transaction) => Promise<T>) {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    return db.transaction(
      async (tx) => {
        const effects: (() => void | Promise<void>)[] = [];
        TransactionContext.provide({ tx, effects: effects });
        const result = await callback(tx);
        await Promise.all(effects.map((x) => x()));
        return result;
      },
      {
        isolationLevel: "serializable",
      }
    );
  }
}

export function createTransactionEffect(effect: () => void | Promise<void>) {
  const { effects } = TransactionContext.use();
  effects.push(effect);
}
