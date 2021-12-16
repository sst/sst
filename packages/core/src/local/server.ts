import { Patch, produceWithPatches, enablePatches } from "immer";
enablePatches();

import ws from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { router, State } from "./router";
import { EventDelegate } from "../events";
import { WritableDraft } from "immer/dist/internal";

type Opts = {
  port: number;
  region: string;
};

export function useLocalServer(opts: Opts) {
  let state: State = {
    functions: {},
  };
  const onStateChange = new EventDelegate<Patch[]>();

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
      };
    },
  });

  process.on("SIGTERM", () => {
    handler.broadcastReconnectNotification();
    wss.close();
  });

  return {
    updateState(cb: (draft: WritableDraft<State>) => void) {
      const [next, patches] = produceWithPatches(state, cb);
      if (!patches) return;
      onStateChange.trigger(patches);
      state = next as any;
    },
  };
}
