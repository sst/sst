import { atom, useAtom } from "jotai";
import { atomWithStorage, selectAtom } from "jotai/utils";
import { trpc } from "./trpc";
import { State } from "../../../core/src/local/router";
import { useMemo } from "react";

const DarkModeAtom = atomWithStorage<boolean>(
  "darkMode",
  window.matchMedia("(prefers-color-scheme: dark)").matches
);

export function useDarkMode() {
  const [darkMode, setDarkMode] = useAtom(DarkModeAtom);

  return {
    enabled: darkMode,
    toggle() {
      setDarkMode(!darkMode);
    },
  };
}

export function useAuth() {
  return trpc.useQuery(["getCredentials"], {
    staleTime: 1000 * 60 * 30,
  });
}

export const RealtimeStateAtom = atom({
  functions: {},
} as State);

export function useRealtimeState<T>(select: (s: State) => T, deps: any[] = []) {
  const atom = useMemo(() => selectAtom(RealtimeStateAtom, select), deps);
  const [read] = useAtom(atom);
  return read;
}

export const SSLAtom = atom(false);

export function useSSL() {
  return useAtom(SSLAtom);
}
