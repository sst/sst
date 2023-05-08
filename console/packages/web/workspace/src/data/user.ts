import { ReadTransaction } from "replicache";
import type { User } from "../../../../core/src/user";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/user/` }).toArray();
    return (result || []) as unknown as User.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/user/${id}`);
    return result as unknown as User.Info;
  };
}

export type UserInfo = User.Info;

export * as UserStore from "./user";
