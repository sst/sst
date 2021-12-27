import React, { useEffect } from "react";
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
} from "./data/global";
import { enablePatches } from "immer";
import { applyPatches } from "dendriform-immer-patch-optimiser";
import { Splash } from "~/components";
import { darkTheme } from "~/stitches.config";
import { useAtom } from "jotai";
import { State } from "@serverless-stack/core/src/local/router";

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
})();

// create persistent WebSocket connection
const ws = createWSClient({
  url:
    `ws://localhost:` +
    (new URLSearchParams(location.search).get("_port") || "13557"),
  retryDelayMs: () => 5000,
});

const trpcClient = trpc.createClient({
  links: [
    wsLink({
      client: ws,
    }),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (e) => console.log(e),
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Main />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
  document.getElementById("root")
);

function Main() {
  console.log("Rendering main");
  const darkMode = useDarkMode();

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
    <div className={darkMode.enabled ? darkTheme : ""}>
      <Realtime state={initialState.data!} />
      <BrowserRouter>
        <Routes>
          <Route path=":app/*" element={<App />} />
          <Route path="*" element={<CatchAll />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

function CatchAll() {
  const [app, stage] = useRealtimeState((s) => [s.app, s.stage]);
  if (app && stage) return <Navigate to={`/${app}/${stage}/local`} />;
  return null;
}

function Realtime(props: { state: State }) {
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
