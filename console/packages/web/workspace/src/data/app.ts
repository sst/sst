import { ReadTransaction, WriteTransaction } from "replicache";
import type { App } from "@console/core/app";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/app/` }).toArray();
    return (result || []) as App.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/app/${id}`);
    return result as App.Info;
  };
}

export async function put(tx: WriteTransaction, app: App.Info) {
  await tx.put(`/app/${app}`, app);
}

export function fromName(name: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.find((item) => item.name === name);
  };
}

export * as AppStore from "./app";
