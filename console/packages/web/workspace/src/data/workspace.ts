import { ReadTransaction } from "replicache";
import type { Workspace } from "../../../../core/src/workspace";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/workspace/` }).toArray();
    return (result || []) as unknown as Workspace.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/workspace/${id}`);
    return result as unknown as Workspace.Info;
  };
}

export * as WorkspaceStore from "./workspace";
