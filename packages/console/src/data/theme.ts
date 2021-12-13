import { atom, useAtom } from "jotai";

const DarkModeAtom = atom<boolean>(
  window.matchMedia("(prefers-color-scheme: dark)").matches
);

export function useDarkMode() {
  return useAtom(DarkModeAtom);
}
