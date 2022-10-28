import { Context } from "@serverless-stack/node/context/context.js";
import { App } from "./App";

export const AppContext = Context.create<App>();

export function createAppContext<C>(cb: () => C) {
  return Context.memo(() => {
    AppContext.use();
    return cb();
  });
}
