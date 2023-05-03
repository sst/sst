import { ReadTransaction } from "replicache";
import type { Account } from "@console/core/aws/account";

export function list() {
  return async (tx: ReadTransaction) => {
    const result = await tx.scan({ prefix: `/aws_account/` }).toArray();
    return (result || []) as unknown as Account.Info[];
  };
}

export function fromID(id: string) {
  return async (tx: ReadTransaction) => {
    const result = await tx.get(`/aws_account/${id}`);
    return result as unknown as Account.Info;
  };
}

export function fromAccountID(accountID: string) {
  return async (tx: ReadTransaction) => {
    const all = await list()(tx);
    return all.find((item) => item.accountID === accountID);
  };
}

export * as AccountStore from "./account";
