import { Route, Routes } from "react-router-dom";
import { useDarkMode, useRealtimeState } from "~/data/global";
import { trpc } from "~/data/trpc";
import { darkTheme } from "~/stitches.config";
import { Stage } from "./Stage";
import { applyPatches, enablePatches } from "immer";
enablePatches();
import { useEffect } from "react";

export function App() {
  const darkMode = useDarkMode();
  const [realtimeState, setRealtimeState] = useRealtimeState();

  const credentials = trpc.useQuery(["getCredentials"], {
    retry: true,
  });
  const initialState = trpc.useQuery(["getState"]);

  useEffect(() => setRealtimeState(initialState.data!), [initialState.data]);

  trpc.useSubscription(["onStateChange"], {
    enabled: initialState.isSuccess,
    onNext: (patches) => {
      setRealtimeState((state) => applyPatches(state, patches));
    },
  });

  useEffect(() => console.log(realtimeState), [realtimeState]);

  if (credentials.isError) return <span>Auth Failed</span>;
  if (credentials.isLoading) return <span>Waiting for CLI...</span>;
  if (initialState.isLoading) return <span>Syncing...</span>;
  if (initialState.isError) return <span>Syncing failed</span>;
  return (
    <div className={darkMode.enabled ? darkTheme : ""}>
      <Routes>
        <Route path=":stage/*" element={<Stage />} />
      </Routes>
    </div>
  );
}
