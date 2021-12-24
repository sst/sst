import { Route, Routes } from "react-router-dom";
import { useDarkMode, useRealtimeState } from "~/data/global";
import { trpc } from "~/data/trpc";
import { darkTheme } from "~/stitches.config";
import { Stage } from "./Stage";
import { applyPatches, enablePatches } from "immer";
enablePatches();
import { useEffect } from "react";
import { Splash } from "~/components";

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

  useEffect(() => console.dir(realtimeState), [realtimeState]);

  if (!credentials.isSuccess && !initialState.isSuccess) return <Splash />;

  return (
    <div className={darkMode.enabled ? darkTheme : ""}>
      <Routes>
        <Route path=":stage/*" element={<Stage />} />
      </Routes>
    </div>
  );
}
