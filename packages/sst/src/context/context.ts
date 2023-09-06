import { AsyncLocalStorage } from "node:async_hooks";

export type Context<C> = {
  readonly name: string | undefined;
  use(): C;
  reset(): void;
  provide(value: C): void;
};

export class ContextNotFoundError extends Error {
  constructor(public name: string) {
    super(
      `${name} context was not provided. It is possible you have multiple versions of SST installed.`
    );
  }
}

const state = {
  tracking: [] as Context<any>[],
};

export function create<C>(): Context<C>;
export function create<C>(name: string): Context<C>;
export function create<C>(cb: () => C): Context<C>;
export function create<C>(name: string, cb: () => C): Context<C>;
export function create<C>(
  arg1?: string | (() => C),
  arg2?: () => C
): Context<C> {
  const name = typeof arg1 === "string" ? arg1 : undefined;
  const cb = typeof arg1 === "function" ? arg1 : arg2;
  const storage = new AsyncLocalStorage<C | undefined>();
  const derived = new Set<Context<any>>();

  const ctx: Context<C> = {
    get name() {
      return name;
    },
    use() {
      let result = storage.getStore();
      if (result === undefined) {
        if (!cb) throw new ContextNotFoundError(name || "UnnamedContext");
        state.tracking.push(ctx);
        result = cb();
        state.tracking.pop();
        storage.enterWith(result);
      }

      const derivedContext = state.tracking[state.tracking.length - 1];
      if (derivedContext) derived.add(derivedContext);

      return result;
    },

    provide(value: C) {
      storage.enterWith(value);
      for (const derivedContext of derived) {
        derivedContext.reset();
      }
    },

    reset() {
      const exist = storage.getStore();
      if (!exist) return;
      storage.enterWith(undefined);
      for (const derivedContext of derived) {
        derivedContext.reset();
      }
    },
  };

  return ctx;
}

/**
 * @deprecated Use `create` instead.
 */
export function memo<C>(cb: () => C): Context<C>["use"];
export function memo<C>(name: string, cb: () => C): Context<C>["use"];
export function memo<C>(
  arg1: string | (() => C),
  arg2?: () => C
): Context<C>["use"] {
  return create<C>(arg1 as any, arg2 as any).use;
}

export const Context = {
  create,
  memo,
};
