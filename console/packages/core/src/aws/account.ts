export * as Account from "./account";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { awsAccount } from "./aws.sql";
import { useWorkspace } from "../actor";
import { and, eq } from "drizzle-orm";
import { Bus, createEvent } from "../bus";
import { assumeRole } from ".";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

export const Info = createSelectSchema(awsAccount, {
  id: (schema) => schema.id.cuid2(),
  accountID: (schema) => schema.accountID.regex(/^[0-9]{12}$/),
});
export type Info = z.infer<typeof Info>;

export const Events = {
  Created: createEvent("aws.account.created", {
    awsAccountID: z.string(),
  }),
};

export const create = zod(
  Info.pick({ id: true, accountID: true }).partial({
    id: true,
  }),
  async (input) =>
    useTransaction(async (tx) => {
      const id = input.id ?? createId();
      await tx.insert(awsAccount).values({
        id,
        workspaceID: useWorkspace(),
        accountID: input.accountID,
      });
      createTransactionEffect(() =>
        Events.Created.publish({
          awsAccountID: id,
        })
      );
      return id;
    })
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

export const bootstrap = zod(
  z.custom<Awaited<ReturnType<typeof assumeRole>>>(),
  async (credentials) => {
    const cf = new CloudFormationClient({
      credentials,
    });

    const bootstrap = await cf
      .send(
        new DescribeStacksCommand({
          StackName: "SSTBootstrap",
        })
      )
      .then((x) => x?.Stacks?.[0]);
    if (!bootstrap) {
      throw new Error("Bootstrap stack not found");
    }

    const bucket = bootstrap.Outputs?.find(
      (x) => x.OutputKey === "BucketName"
    )?.OutputValue;

    if (!bucket) throw new Error("BucketName not found");

    return {
      bucket,
    };
  }
);
