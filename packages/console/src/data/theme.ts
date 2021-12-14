import { atom, useAtom } from "jotai";

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
