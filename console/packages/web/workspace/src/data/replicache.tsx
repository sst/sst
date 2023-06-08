import { Replicache, ReadTransaction } from "replicache";
import {
  ParentProps,
  Show,
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  useContext,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { useAuth } from "./auth";
import type { ServerType } from "@console/functions/replicache/server";
import { Client } from "../../../../functions/src/replicache/framework";

const mutators = new Client<ServerType>()
  .mutation("connect", async (tx, input) => {})
  .build();

const ReplicacheContext =
  createContext<() => ReturnType<typeof createReplicache>>();

function createReplicache(workspaceID: string, token: string) {
  const replicache = new Replicache({
    name: workspaceID,
    auth: `Bearer ${token}`,
    licenseKey: "l24ea5a24b71247c1b2bb78fa2bca2336",
    pullURL: import.meta.env.VITE_API_URL + "/replicache/pull",
    pushURL: import.meta.env.VITE_API_URL + "/replicache/push",
    pullInterval: 10 * 1000,
    mutators,
  });

  replicache.subscribe(
    (tx) => {
      return tx.scan({ prefix: "" }).entries().toArray();
    },
    {
      onData: console.log,
    }
  );

  const oldPuller = replicache.puller;
  replicache.puller = (opts) => {
    opts.headers.append("x-sst-workspace", workspaceID);
    return oldPuller(opts);
  };

  const oldPusher = replicache.pusher;
  replicache.pusher = (opts) => {
    opts.headers.append("x-sst-workspace", workspaceID);
    return oldPusher(opts);
  };

  return replicache;
}

export function ReplicacheProvider(
  props: ParentProps<{ accountID: string; workspaceID: string }>
) {
  const tokens = useAuth();
  const token = createMemo(() => tokens[props.accountID]?.token.token);

  const rep = createMemo(() => {
    return createReplicache(props.workspaceID, token()!);
  });

  onCleanup(() => {
    rep().close();
  });

  return (
    <Show when={rep()}>
      <ReplicacheContext.Provider value={rep}>
        {props.children}
      </ReplicacheContext.Provider>
    </Show>
  );
}

export function useReplicache() {
  const result = useContext(ReplicacheContext);
  if (!result) {
    throw new Error("useReplicache must be used within a ReplicacheProvider");
  }

  return result;
}

export function createSubscription<R, D = undefined>(
  body: () => (tx: ReadTransaction) => Promise<R>,
  initial?: D,
  replicache?: () => Replicache
) {
  const [store, setStore] = createStore({ result: initial as any });

  let unsubscribe: () => void;

  createEffect(() => {
    if (unsubscribe) unsubscribe();
    setStore({ result: initial as any });

    const r = replicache ? replicache() : useReplicache()();
    unsubscribe = r.subscribe(
      // @ts-expect-error
      body(),
      {
        onData: (val) => {
          setStore(reconcile({ result: val }));
        },
      }
    );
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return () => store.result as R | D;
}
