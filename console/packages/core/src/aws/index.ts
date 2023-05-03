import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";

export { Account } from "./account";
import { stage } from "../app/app.sql";
import { eq } from "drizzle-orm";
import { awsAccount } from "./aws.sql";
import { useWorkspace } from "../actor";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

export * as AWS from ".";

const sts = new STSClient({});

export const assumeRole = zod(
  z.object({
    stageID: z.string(),
  }),
  async (input) =>
    useTransaction(async (tx) => {
      const { accountID } = await tx
        .select({
          accountID: awsAccount.accountID,
        })
        .from(stage)
        .leftJoin(awsAccount, eq(awsAccount.id, stage.awsAccountID))
        .where(eq(stage.id, input.stageID))
        .where(eq(stage.workspaceID, useWorkspace()))
        .execute()
        .then((x) => x.at(0)!);

      const result = await sts.send(
        new AssumeRoleCommand({
          RoleArn: `arn:aws:iam::${accountID}:role/sst`,
          RoleSessionName: "sst",
          DurationSeconds: 900,
        })
      );
      console.log("worked", result.$metadata);
    })
);
