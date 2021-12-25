import React, { useEffect } from "react";
import "@fontsource/jetbrains-mono/latin.css";
import ReactDOM from "react-dom";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App } from "~/App";
import { globalCss } from "./stitches.config";
import { QueryClient, QueryClientProvider } from "react-query";
import { createWSClient, wsLink } from "@trpc/client/links/wsLink";
import { trpc } from "~/data/trpc";
import { useDarkMode, useRealtimeState } from "./data/global";
import { applyPatches, enablePatches } from "immer";
import { Spinner, Splash } from "~/components";
import { darkTheme } from "~/stitches.config";

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
    (new URLSearchParams(location.search).get("_port") || "4000"),
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
  const darkMode = useDarkMode();
  const [realtimeState, setRealtimeState] = useRealtimeState();

  const credentials = trpc.useQuery(["getCredentials"], {
    retry: true,
  });
  const initialState = trpc.useQuery(["getState"]);

  trpc.useSubscription(["onStateChange"], {
    enabled: initialState.isSuccess,
    onNext: (patches) => {
      setRealtimeState((state) => applyPatches(state, patches));
    },
  });
  useEffect(() => setRealtimeState(initialState.data!), [initialState.data]);

  useEffect(() => console.dir(realtimeState), [realtimeState]);

  if (credentials.isLoading) return <Splash spinner>Waiting for CLI</Splash>;

  if (initialState.isLoading || !realtimeState)
    return <Splash spinner>Syncing initial state</Splash>;

  if (!credentials.isSuccess)
    return <Splash>Error fetching credentials from CLI</Splash>;

  if (!initialState.isSuccess)
    return <Splash>Error syncing initial state</Splash>;

  return (
    <div className={darkMode.enabled ? darkTheme : ""}>
      <BrowserRouter>
        <Routes>
          <Route path=":app/*" element={<App />} />
          <Route
            path="/"
            element={
              <Navigate
                replace
                to={`${realtimeState.app}/${realtimeState.stage}/local`}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
