import { App } from "./App.js";

const AppContext = (() => {
  let app: App | undefined;
  const children = new Map<any, any>();

  return {
    set(input: App) {
      children.clear();
      app = input;
    },
    get current() {
      return app;
    },
    createAppContext<C>(cb: () => C) {
      return () => {
        const exists = children.get(cb);
        if (exists) return exists as C;
        const val = cb();
        children.set(cb, val);
        return val;
      };
    },
  };
})();

export function provideApp(app: App) {
  AppContext.set(app);
}

export const createAppContext = AppContext.createAppContext;
