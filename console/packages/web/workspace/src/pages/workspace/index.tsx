import { Route, Routes, useParams } from "@solidjs/router";
import { ReplicacheProvider } from "../../data/replicache";
import { Connect } from "./connect";

export function Workspace() {
  const params = useParams();

  return (
    <ReplicacheProvider
      accountID={params.accountID}
      workspaceID={params.workspaceID}
    >
      <Routes>
        <Route path="connect" component={Connect} />
      </Routes>
    </ReplicacheProvider>
  );
}
