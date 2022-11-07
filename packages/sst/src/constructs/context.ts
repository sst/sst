import { Context } from "../context/context.js";
import { App } from "./App";

export const AppContext = Context.create<App>();
export const useApp = AppContext.use;

export function createAppContext<C>(cb: () => C) {
  return Context.memo(() => {
    AppContext.use();
    return cb();
  });
}
