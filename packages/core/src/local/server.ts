import { produceWithPatches, enablePatches } from "immer";
import express from "express";
import fs from "fs/promises";
enablePatches();

import { WebSocketServer } from "ws";
import https from "https";
import http from "http";
import { applyWSSHandler } from "@trpc/server/adapters/ws/dist/trpc-server-adapters-ws.cjs.js";
import { FunctionState, router, State } from "./router.js";
import { EventDelegate } from "../events.js";
import { WritableDraft } from "immer/dist/internal";
import { DendriformPatch, optimise } from "dendriform-immer-patch-optimiser";
import { sync } from "cross-spawn";

type Opts = {
  port: number;
  key: any;
  cert: any;
  region: string;
  app: string;
  stage: string;
  live: boolean;
};

export async function useLocalServer(opts: Opts) {
  let state: State = {
    app: opts.app,
    stage: opts.stage,
    live: opts.live,
    stacks: {
      status: "idle",
    },
    functions: {},
  };
  const onStateChange = new EventDelegate<DendriformPatch[]>();
  const onDeploy = new EventDelegate<void>();

  const rest = express();

  rest.get(`/ping`, (_, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.sendStatus(200);
  });

  rest.all<{
    href: string;
  }>(
    `/proxy*`,
    express.raw({
      type: "*/*",
      limit: "1024mb",
    }),
    (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, PUT, PATCH, POST, DELETE"
      );
      res.header(
        "Access-Control-Allow-Headers",
        req.header("access-control-request-headers")
      );

      if (req.method === "OPTIONS") return res.send();
      const u = new URL(req.url.substring(7));
      const forward = https.request(
        u,
        {
          headers: {
            ...req.headers,
            host: u.hostname,
          },
          method: req.method,
        },
        (proxied) => {
          res.status(proxied.statusCode!);
          for (const [key, value] of Object.entries(proxied.headers)) {
            res.header(key, value);
          }
          proxied.pipe(res);
        }
      );
      if (
        req.method !== "GET" &&
        req.method !== "DELETE" &&
        req.method !== "HEAD" &&
        req.body
      )
        forward.write(req.body);
      forward.end();
      forward.on("error", (e) => {
        console.log(e.message);
      });
    }
  );

  const server = await (async () => {
    const result = sync("mkcert", ["--help"]);
    const KEY_PATH = ".sst/localhost-key.pem";
    const CERT_PATH = ".sst/localhost.pem";
    if (result.status === 0) {
      try {
        await Promise.all([fs.access(KEY_PATH), fs.access(CERT_PATH)]);
      } catch (e) {
        sync("mkcert", ["localhost"], {
          cwd: ".sst",
        });
      }
      const [key, cert] = await Promise.all([
        fs.readFile(KEY_PATH),
        fs.readFile(CERT_PATH),
      ]);
      return https.createServer(
        {
          key: key,
          cert: cert,
        },
        rest
      );
    }

    return http.createServer({}, rest);
  })();

  // Wire up websocket

  const wss = new WebSocketServer({ server });
  wss.on("connection", (socket, req) => {
    if (req.headers.origin?.endsWith("localhost:3000")) return;
    if (req.headers.origin?.endsWith("console.serverless-stack.com")) return;
    if (req.headers.origin?.endsWith("console.sst.dev")) return;
    if (req.headers.origin?.endsWith("--sst-console.netlify.app")) return;
    console.log("Rejecting unauthorized connection from " + req.headers.origin);
    socket.terminate();
  });

  server.listen(opts.port);
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
