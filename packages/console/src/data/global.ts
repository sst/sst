import { atom, useAtom } from "jotai";
import { trpc } from "./trpc";
import { State } from "../../../core/src/local/router";

const DarkModeAtom = atom<boolean>(
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

const RealtimeStateAtom = atom({
  functions: {},
} as State);

export function useRealtimeState() {
  return useAtom(RealtimeStateAtom);
}
