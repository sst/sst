import { Link, useSearchParams } from "@solidjs/router";
import { createSubscription, useReplicache } from "../../data/replicache";
import { useAuth } from "../../data/auth";
import { For } from "solid-js";
import { UserStore } from "../../data/user";
import { WorkspaceStore } from "../../data/workspace";

export function Connect() {
  const auth = useAuth();
  return (
    <div>
      Which workspace should we connect to?
      <For each={Object.values(auth)}>
        {(entry) => {
          const users = createSubscription(
            UserStore.list,
            [],
            () => entry.replicache
          );
          return (
            <ol>
              <li>{users()[0]?.email}</li>
              <ol>
                <For each={users()}>
                  {(user) => {
                    const workspace = createSubscription(
                      () => WorkspaceStore.fromID(user.workspaceID),
                      () => entry.replicache
                    );
                    return (
                      <li>
                        <Link
                          href={`/${entry.token.accountID}/${
                            workspace()?.id
                          }/connect${location.search}`}
                        >
                          {" "}
                          Workspace: {workspace()?.slug}
                        </Link>
                      </li>
                    );
                  }}
                </For>
              </ol>
            </ol>
          );
        }}
      </For>
    </div>
  );
}
