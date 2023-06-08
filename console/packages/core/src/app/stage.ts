import { createSelectSchema } from "drizzle-zod";
import { app, resource, stage } from "./app.sql";
import { z } from "zod";
import { zod } from "../util/zod";
import { createTransactionEffect, useTransaction } from "../util/transaction";
import { createId } from "@paralleldrive/cuid2";
import { useWorkspace } from "../actor";
import { awsAccount } from "../aws/aws.sql";
import { and, eq } from "drizzle-orm";
import { AWS } from "../aws";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Bus, createEvent } from "../bus";

export * as Stage from "./stage";

export const Events = {
  Connected: createEvent("app.stage.connected", {
    stageID: z.string().nonempty(),
  }),
};

export const Info = createSelectSchema(stage, {
  id: (schema) => schema.id.cuid2(),
});
export type Info = z.infer<typeof Info>;

export const connect = zod(
  Info.pick({
    name: true,
    appID: true,
    id: true,
    awsAccountID: true,
    region: true,
  }).partial({
    id: true,
  }),
  async (input) => {
    const id = input.id ?? createId();
    return useTransaction(async (tx) => {
      const result = await tx
        .insert(stage)
        .values({
          id,
          appID: input.appID,
          workspaceID: useWorkspace(),
          awsAccountID: input.awsAccountID,
          name: input.name,
          region: input.region,
        })
        .onDuplicateKeyUpdate({
          set: {
            awsAccountID: input.awsAccountID,
            region: input.region,
          },
        })
        .execute();
      const { insertID } = await tx
        .select({ insertID: stage.id })
        .from(stage)
        .where(
          and(
            eq(stage.workspaceID, useWorkspace()),
            eq(stage.appID, input.appID),
            eq(stage.name, input.name),
            eq(stage.region, input.region)
          )
        )
        .execute()
        .then((x) => x[0]!);
      createTransactionEffect(() =>
        Bus.publish("app.stage.connected", {
          stageID: insertID,
        })
      );
      return insertID;
    });
  }
);

export const syncMetadata = zod(Info.shape.id, async (stageID) =>
  useTransaction(async (tx) => {
    console.log("syncing metadata", stageID);
    const row = await tx
      .select({
        app: app.name,
        accountID: awsAccount.accountID,
        stage: stage.name,
        region: stage.region,
      })
      .from(stage)
      .innerJoin(app, eq(stage.appID, app.id))
      .innerJoin(awsAccount, eq(stage.awsAccountID, awsAccount.id))
      .where(and(eq(stage.id, stageID), eq(stage.workspaceID, useWorkspace())))
      .execute()
      .then((x) => x[0]);
    if (!row) {
      return;
    }
    console.log(row.app, row.stage, row.region, row.accountID);
    const credentials = await AWS.assumeRole(row.accountID);
    const { bucket } = await AWS.Account.bootstrap(credentials);
    const s3 = new S3Client({
      credentials,
      region: row.region,
    });
    const key = `stackMetadata/app.${row.app}/stage.${row.stage}/`;
    const list = await s3.send(
      new ListObjectsV2Command({
        Prefix: key,
        Bucket: bucket,
      })
    );
    console.log("found", list.Contents?.length, "resources");
    useTransaction(async (tx) => {
      await Promise.all(
        list.Contents?.map(async (obj) => {
          const stackID = obj.Key?.split("/").pop()!;
          const result = await s3.send(
            new GetObjectCommand({
              Key: obj.Key!,
              Bucket: bucket,
            })
          );
          const body = await result.Body!.transformToString();
          await tx
            .delete(resource)
            .where(
              and(
                eq(resource.stackID, stackID),
                eq(resource.workspaceID, useWorkspace())
              )
            )
            .execute();
          for (let res of JSON.parse(body)) {
            await tx
              .insert(resource)
              .values({
                workspaceID: useWorkspace(),
                cfnID: res.id,
                addr: res.addr,
                stackID,
                stageID,
                id: createId(),
                type: res.type,
                data: res.data,
              })
              .execute();
          }
        }) || []
      );
    });
  })
);
