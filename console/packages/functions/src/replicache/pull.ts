import { useActor, useWorkspace } from "@console/core/actor";
import { Replicache } from "@console/core/replicache";
import { user } from "@console/core/user/user.sql";
import { useTransaction } from "@console/core/util/transaction";
import { useApiAuth } from "src/api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { eq, and, gt } from "drizzle-orm";
import { workspace } from "@console/core/workspace/workspace.sql";
import { app, resource, stage } from "@console/core/app/app.sql";
import { awsAccount } from "@console/core/aws/aws.sql";

const VERSION = 1;
export const handler = ApiHandler(async () => {
  await useApiAuth();
  const actor = useActor();

  if (actor.type === "public") {
    return {
      statusCode: 401,
    };
  }

  const body = useJsonBody();
  const lastSync =
    body.cookie && body.cookie.version === VERSION
      ? body.cookie.lastSync
      : new Date(0).toISOString();
  console.log("lastSync", lastSync);
  const result = {
    patch: [] as any[],
    lastSync,
  };

  if (new Date(lastSync).getTime() === 0) {
    result.patch.push({
      op: "clear",
    });
  }

  return await useTransaction(async (tx) => {
    const client = await Replicache.fromID(body.clientID);

    if (actor.type === "user") {
      const workspaceID = useWorkspace();
      console.log("syncing user", actor.properties);
      const [workspaces, users, awsAccounts, apps, stages, resources] =
        await Promise.all([
          await tx
            .select()
            .from(workspace)
            .where(
              and(
                eq(workspace.id, useWorkspace()),
                gt(workspace.timeUpdated, lastSync)
              )
            )
            .execute(),
          await tx
            .select()
            .from(user)
            .where(
              and(
                eq(user.workspaceID, useWorkspace()),
                gt(user.timeUpdated, lastSync)
              )
            )
            .execute(),
          await tx
            .select()
            .from(awsAccount)
            .where(
              and(
                eq(awsAccount.workspaceID, workspaceID),
                gt(awsAccount.timeUpdated, lastSync)
              )
            )
            .execute(),
          await tx
            .select()
            .from(app)
            .where(
              and(
                eq(app.workspaceID, workspaceID),
                gt(app.timeUpdated, lastSync)
              )
            )
            .execute(),
          await tx
            .select()
            .from(stage)
            .where(
              and(
                eq(stage.workspaceID, workspaceID),
                gt(stage.timeUpdated, lastSync)
              )
            )
            .execute(),
          await tx
            .select()
            .from(resource)
            .where(
              and(
                eq(resource.workspaceID, workspaceID),
                gt(resource.timeUpdated, lastSync)
              )
            )
            .execute(),
        ]);
      result.patch.push(
        ...users.map((item) => ({
          op: "put",
          key: `/user/${item.id}`,
          value: item,
        })),
        ...workspaces.map((item) => ({
          op: "put",
          key: `/workspace/${item.id}`,
          value: item,
        })),
        ...apps.map((item) => ({
          op: "put",
          key: `/app/${item.id}`,
          value: item,
        })),
        ...stages.map((item) => ({
          op: "put",
          key: `/stage/${item.id}`,
          value: item,
        })),
        ...awsAccounts.map((item) => ({
          op: "put",
          key: `/aws_account/${item.id}`,
          value: item,
        })),
        ...resources.map((item) => ({
          op: "put",
          key: `/resource/${item.id}`,
          value: item,
        }))
      );
      result.lastSync =
        result.patch
          .filter((x) => x.op === "put")
          .sort((a, b) =>
            (b.value.timeUpdated || "") > (a.value.timeUpdated || "") ? 1 : -1
          )[0]?.value?.timeUpdated || lastSync;
    }

    if (actor.type === "account") {
      console.log("syncing account", actor.properties);
      const [users] = await Promise.all([
        await tx
          .select()
          .from(user)
          .where(
            and(
              eq(user.email, actor.properties.email),
              gt(user.timeUpdated, lastSync)
            )
          )
          .execute(),
      ]);

      const workspaces = await tx
        .select()
        .from(workspace)
        .leftJoin(user, eq(user.workspaceID, workspace.id))
        .where(
          and(
            eq(user.email, actor.properties.email),
            gt(workspace.timeUpdated, lastSync)
          )
        )
        .execute()
        .then((rows) => rows.map((row) => row.workspace));
      console.log("workspaces", workspaces);

      /*
      const workspaces =
        users.length > 0
          ? await tx
              .select()
              .from(workspace)
              .where(
                and(
                  inArray(
                    workspace.id,
                    users.map((u) => u.workspaceID)
                  ),
                  gt(workspace.timeUpdated, lastSync)
                )
              )
              .execute()
          : [];
          */
      console.log("found workspaces", workspaces);

      result.patch.push(
        ...users.map((item) => ({
          op: "put",
          key: `/user/${item.id}`,
          value: item,
        })),
        ...workspaces.map((item) => ({
          op: "put",
          key: `/workspace/${item.id}`,
          value: item,
        }))
      );
      result.lastSync =
        [...workspaces, ...users].sort((a, b) =>
          b.timeUpdated > a.timeUpdated ? 1 : -1
        )[0]?.timeUpdated || lastSync;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        lastMutationID: client?.mutationID || 0,
        patch: result.patch,
        cookie: {
          version: VERSION,
          lastSync: result.lastSync,
        },
      }),
    };
  });
});
