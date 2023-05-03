export * as Account from "./account";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { useTransaction } from "../util/transaction";
import { awsAccount } from "./aws.sql";
import { useWorkspace } from "../actor";
import { and, eq } from "drizzle-orm";
import { Bus } from "../bus";

export const Info = createSelectSchema(awsAccount, {
  id: (schema) => schema.id.cuid2(),
  accountID: (schema) => schema.accountID.regex(/^[0-9]{12}$/),
});
export type Info = z.infer<typeof Info>;

declare module "../bus" {
  export interface Events {
    "aws.account.created": {
      id: string;
    };
  }
}

export const create = zod(
  Info.pick({ id: true, accountID: true }).partial({
    id: true,
  }),
  async (input) => {
    const id = input.id ?? createId();
    return useTransaction(async (tx) => {
      await tx.insert(awsAccount).values({
        id,
        workspaceID: useWorkspace(),
        accountID: input.accountID,
      });
      await Bus.publish("aws.account.created", { id });
      return id;
    });
  }
);

export const fromAccountID = zod(Info.shape.accountID, async (accountID) =>
  useTransaction((tx) =>
    tx
      .select()
      .from(awsAccount)
      .where(
        and(
          eq(awsAccount.accountID, accountID),
          eq(awsAccount.workspaceID, useWorkspace())
        )
      )
      .execute()
      .then((rows) => rows[0])
  )
);
