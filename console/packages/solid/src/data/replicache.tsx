import { Replicache } from "replicache";
import { ParentProps, createContext, useContext } from "solid-js";

const GlobalReplicacheContext =
  createContext<ReturnType<typeof createGlobalReplicache>>();

function createGlobalReplicache() {
  const replicache = new Replicache({
    name: "global",
    licenseKey: "l24ea5a24b71247c1b2bb78fa2bca2336",
    pullURL: import.meta.env.VITE_API_URL + "/replicache/pull",
    pushURL: import.meta.env.VITE_API_URL + "/replicache/push",
  });
  return replicache;
}

export function GlobalReplicacheProvider(props: ParentProps) {
  const rep = createGlobalReplicache();

  return (
    <GlobalReplicacheContext.Provider value={rep}>
      {props.children}
    </GlobalReplicacheContext.Provider>
  );
}

export function useGlobalReplicache() {
  const result = useContext(GlobalReplicacheContext);
  if (!result) {
    throw new Error(
      "useGlobalReplicache must be used within a GlobalReplicacheProvider"
    );
  }

  return result;
}
