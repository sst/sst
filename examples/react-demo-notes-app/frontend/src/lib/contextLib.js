import { useContext, createContext } from "react";

export const AppContext = createContext(null);

export function useAppContext() {
  return useContext(AppContext);
}
