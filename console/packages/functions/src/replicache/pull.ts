import { useActor, useWorkspace } from "@console/core/actor";
import { Replicache } from "@console/core/replicache";
import { user } from "@console/core/user/user.sql";
import { useTransaction } from "@console/core/util/transaction";
import { useApiAuth } from "src/api";
import { ApiHandler, useJsonBody } from "sst/node/api";
import { eq, and, gt, inArray } from "drizzle-orm";
import { workspace } from "@console/core/workspace/workspace.sql";

const VERSION = 0;
export const handler = ApiHandler(async () => {
  await useApiAuth();

  const actor = useActor();
  const body = useJsonBody();
  const lastSync =
    body.cookie && body.cookie.version === VERSION
      ? new Date(body.cookie.lastSync)
      : new Date(0);
  const result = {
    patch: [] as any[],
    lastSync,
  };

  if (lastSync.getTime() === 0) {
    result.patch.push({
      op: "clear",
    });
  }

  return await useTransaction(async (tx) => {
    const client = await Replicache.fromID(body.clientID);
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

    if (actor.type === "user") {
      console.log("syncing user", actor.properties);
      const [workspaces, users] = await Promise.all([
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
