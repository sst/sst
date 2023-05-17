import { Link, Route, Routes, useParams } from "@solidjs/router";
import { createSubscription } from "../../../../data/replicache";
import { StageStore } from "../../../../data/stage";
import { For } from "solid-js";
import { Single } from "./single";

export function Stages() {
  return (
    <Routes>
      <Route path="" component={List} />
      <Route path=":stageID" component={Single} />
    </Routes>
  );
}

export function List() {
  const params = useParams();
  const stages = createSubscription(() => StageStore.forApp(params.appID));
  return (
    <ul>
      <For each={stages()}>
        {(stage) => (
          <li>
            <Link href={stage.id}>{stage.name}</Link>
          </li>
        )}
      </For>
    </ul>
  );
}
