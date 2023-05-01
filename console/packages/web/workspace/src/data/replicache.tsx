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
  });
  const oldPuller = replicache.puller;
  replicache.puller = (opts) => {
    opts.headers.append("x-sst-workspace", workspaceID);
    return oldPuller(opts);
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
  replicache: () => Replicache,
  body: () => (tx: ReadTransaction) => Promise<R>,
  initial?: D
) {
  const [store, setStore] = createStore({ result: initial as any });

  let unsubscribe: () => void;

  createEffect(() => {
    if (unsubscribe) unsubscribe();
    setStore({ result: initial as any });

    // @ts-expect-error
    unsubscribe = replicache().subscribe(body(), {
      onData: (val) => {
        setStore(reconcile({ result: val }));
      },
    });
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
  });

  return () => store.result as R | D;
}
