import { Patch, produceWithPatches, enablePatches } from "immer";
enablePatches();

import ws from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { FunctionState, router, State } from "./router";
import { EventDelegate } from "../events";
import { WritableDraft } from "immer/dist/internal";
import { DendriformPatch, optimise } from "dendriform-immer-patch-optimiser";

type Opts = {
  port: number;
  region: string;
  app: string;
  stage: string;
};

export function useLocalServer(opts: Opts) {
  let state: State = {
    app: opts.app,
    stage: opts.stage,
    stacks: {
      status: "idle",
    },
    functions: {},
  };
  const onStateChange = new EventDelegate<DendriformPatch[]>();
  const onDeploy = new EventDelegate<void>();

  // Wire up websocket
  const wss = new ws.Server({
    port: opts.port,
  });
  const handler = applyWSSHandler({
    wss,
    router,
    createContext() {
      return {
        region: opts.region,
        state,
        onStateChange,
        onDeploy,
      };
    },
  });

  process.on("SIGTERM", () => {
    handler.broadcastReconnectNotification();
    wss.close();
  });

  const pending: DendriformPatch[] = [];
  function updateState(cb: (draft: WritableDraft<State>) => void) {
    const [next, patches] = produceWithPatches(state, cb);
    if (!patches.length) return;

    const scheduled = pending.length;
    pending.push(...optimise(state, patches));
    if (!scheduled)
      setTimeout(() => {
        onStateChange.trigger(pending);
        pending.splice(0, pending.length);
      }, 100);
    state = next as any;
  }

  return {
    port: opts.port,
    updateState,
    onDeploy,
    updateFunction(
      id: string,
      cb: (draft: WritableDraft<FunctionState>) => void
    ) {
      return updateState((draft) => {
        let func = draft.functions[id];
        if (!func) {
          func = {
            warm: false,
            state: "idle",
            issues: {},
            invocations: [],
          };
          draft.functions[id] = func;
        }
        cb(func);
      });
    },
  };
}
