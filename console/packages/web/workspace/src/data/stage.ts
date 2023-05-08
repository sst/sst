import { ReadTransaction } from "replicache";
import type { App } from "@console/core/app";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/stage/` }).toArray();
    return (result || []) as unknown as App.Stage[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/stage/${id}`);
    return result as unknown as App.Stage;
  };
}

export function forApp(appID: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.filter((stage) => stage.appID === appID);
  };
}

export * as AppStore from "./app";
