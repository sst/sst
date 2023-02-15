import React, { PropsWithChildren, useEffect, useState } from "react";
import "@fontsource/jetbrains-mono/latin.css";
import ReactDOM from "react-dom";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App } from "~/App";
import { globalCss } from "./stitches.config";
import { QueryClient, QueryClientProvider } from "react-query";
import { createWSClient, wsLink } from "@trpc/client/links/wsLink";
import { trpc } from "~/data/trpc";
import {
  RealtimeStateAtom,
  useDarkMode,
  useRealtimeState,
  useSSL,
} from "./data/global";
import { enablePatches } from "immer";
import { applyPatches } from "dendriform-immer-patch-optimiser";
import { Splash } from "~/components";
import { darkTheme } from "~/stitches.config";
import { useAtom } from "jotai";
import { State } from "@serverless-stack/core/src/local/router";
import { Buffer } from "buffer";
window.Buffer = Buffer;

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

console.log(import.meta.env);
if (location.host === "console.sst.dev") {
  Sentry.init({
    dsn: "https://f9c6d13f812343a0887199063b2f97fc@o1150240.ingest.sentry.io/6228365",
    integrations: [new BrowserTracing()],
    release: import.meta.env.VITE_SENTRY_RELEASE as string,
    tracesSampleRate: 1.0,
  });
}

enablePatches();

globalCss({
  body: {
    fontFamily: "$sans",
  },
  "*": {
    boxSizing: "border-box",
    lineHeight: 1,
  },
  a: {
    textDecoration: "none",
  },
  "::selection": {
    background: "$highlight",
    color: "white",
  },
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (e) => console.log(e),
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Trpc>
        <DarkMode>
          <Main />
        </DarkMode>
      </Trpc>
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

function Trpc(props: PropsWithChildren<{}>) {
  const [client, setClient] = useState<ReturnType<typeof trpc.createClient>>();
  const [, setSSL] = useSSL();

  useEffect(() => {
    async function boot() {
      let isSSL = true;
      const port = new URLSearchParams(location.search).get("_port") || "13557";

      while (true) {
        const protocol = isSSL ? "https" : "http";
        const resp = await fetch(
          isSSL
            ? `https://localhost:${port}/ping`
            : `http://localhost:${port}/ping`
        ).catch((err) => {
          console.log(protocol, JSON.stringify(err));
        });
        if (resp && resp.status === 200) break;
        await new Promise((r) => setTimeout(r, 1000));
        isSSL = !isSSL;
      }

      // create persistent WebSocket connection
      const ws = createWSClient({
        url: `${isSSL ? "wss" : "ws"}://localhost:${port}`,
        retryDelayMs: () => 5000,
      });

      const trpcClient = trpc.createClient({
        links: [
          wsLink({
            client: ws,
          }),
        ],
      });

      setSSL(isSSL);
      setClient(trpcClient);
    }

    boot();
  }, []);

  if (!client) return <Splash spinner>Waiting for CLI</Splash>;
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      {props.children}
    </trpc.Provider>
  );
}

function DarkMode(props: PropsWithChildren<{}>) {
  const darkMode = useDarkMode();
  return (
    <div className={darkMode.enabled ? darkTheme : ""}>{props.children}</div>
  );
}

function Main() {
  console.log("Rendering main");

  const credentials = trpc.useQuery(["getCredentials"], {
    retry: true,
    staleTime: 1000 * 60 * 60,
  });

  const initialState = trpc.useQuery(["getState"], {
    staleTime: 1000 * 60 * 60,
  });

  if (credentials.isLoading) return <Splash spinner>Waiting for CLI</Splash>;
  if (initialState.isLoading)
    return <Splash spinner>Syncing initial state</Splash>;

  if (credentials.isError)
    return <Splash>Error fetching credentials from CLI</Splash>;

  if (initialState.isError) return <Splash>Error syncing initial state</Splash>;

  return (
    <>
      <Realtime state={initialState.data!} />
      <BrowserRouter>
        <Routes>
          <Route path=":app/*" element={<App />} />
          <Route path="*" element={<CatchAll />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function CatchAll() {
  const [app, stage, live] = useRealtimeState((s) => [s.app, s.stage, s.live]);
  if (app && stage)
    return (
      <Navigate replace to={`/${app}/${stage}/${live ? "local" : "stacks"}`} />
    );
  return null;
}

function Realtime(props: { state: State }): null {
  const [realtimeState, setRealtimeState] = useAtom(RealtimeStateAtom);

  trpc.useSubscription(["onStateChange"], {
    onNext: (patches) => {
      setRealtimeState((state) => applyPatches(state, patches));
    },
  });

  useEffect(() => console.log(realtimeState), [realtimeState]);
  useEffect(() => {
    setRealtimeState(props.state);
  }, []);
  return null;
}
