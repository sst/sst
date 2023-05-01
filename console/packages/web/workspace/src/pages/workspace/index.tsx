import { Routes, useParams } from "@solidjs/router";
import { ReplicacheProvider } from "../../data/replicache";

export function Workspace() {
  const params = useParams();

  return (
    <ReplicacheProvider
      accountID={params.accountID}
      workspaceID={params.workspaceID}
    >
      Hello
    </ReplicacheProvider>
  );
}
