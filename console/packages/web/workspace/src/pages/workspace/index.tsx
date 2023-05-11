import { Link, Navigate, Route, Routes, useParams } from "@solidjs/router";
import { ReplicacheProvider, createSubscription } from "../../data/replicache";
import { Connect } from "./connect";
import { Apps } from "./apps";
import { AppStore } from "../../data/app";
import { For } from "solid-js";

export function Workspace() {
  const params = useParams();

  return (
    <ReplicacheProvider
      accountID={params.accountID}
      workspaceID={params.workspaceID}
    >
      <Routes>
        <Route path="connect" component={Connect} />
        <Route path="apps/*" component={Apps} />
        <Route path="*" element={<Navigate href="apps" />} />
      </Routes>
    </ReplicacheProvider>
  );
}
