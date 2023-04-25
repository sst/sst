import { Replicache } from "replicache";
import { ParentProps, createContext } from "solid-js";

const ReplicacheContext = createContext<ReturnType<typeof createReplicache>>();

function createReplicache() {
  const replicache = new Replicache({
    name: "sst",
    auth: "",
    licenseKey: "l24ea5a24b71247c1b2bb78fa2bca2336",
  });
  return replicache;
}

export function ReplicacheProvider(props: ParentProps) {
  const rep = createReplicache();

  return (
    <ReplicacheContext.Provider value={rep}>
      {props.children}
    </ReplicacheContext.Provider>
  );
}
