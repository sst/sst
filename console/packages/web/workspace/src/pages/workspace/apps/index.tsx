import { Link, Navigate, Route, Routes, useParams } from "@solidjs/router";
import { Stages } from "./stages";
import { createSubscription } from "../../../data/replicache";
import { AppStore } from "../../../data/app";
import { For } from "solid-js";

export function Apps() {
  return (
    <Routes>
      <Route path="" component={List} />
      <Route path=":appID/*" component={Single} />
    </Routes>
  );
}

export function List() {
  const apps = createSubscription(AppStore.list);

  return (
    <ul>
      <For each={apps()}>
        {(app) => (
          <li>
            <Link href={app.id}>{app.name}</Link>
          </li>
        )}
      </For>
    </ul>
  );
}

export function Single() {
  return (
    <Routes>
      <Route path="stages/*" component={Stages} />
      <Route path="*" element={<Navigate href="stages" />} />
    </Routes>
  );
}
