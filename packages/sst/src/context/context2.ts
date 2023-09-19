import { AsyncLocalStorage } from "async_hooks";

export class ContextNotFoundError extends Error {
  constructor(public name: string) {
    super(
      `${name} context was not provided. It is possible you have multiple versions of SST installed.`
    );
  }
}

export type Context<T> = ReturnType<typeof create<T>>;

let count = 0;
export function create<T>(name: string) {
  const storage = new AsyncLocalStorage<{
    value: T;
    version: string;
  }>();

  const children = [] as MemoReset[];
  // notify all memos to reset
  function reset() {
    for (const child of children) {
      child();
    }
  }

  const ctx = {
    name,
    with<R>(value: T, cb: () => R) {
      const version = (++count).toString();
      return storage.run({ value, version }, () => {
        return runWithCleanup(cb, () => reset());
      });
    },
    use() {
      const memo = ContextMemo.getStore();
      // use is being called within a memo, so track dependency
      if (memo) {
        memo.deps.push(ctx);
        children.push(memo.reset);
      }
      const result = storage.getStore();
      if (result === undefined) throw new ContextNotFoundError(name);
      return result.value;
    },
    version() {
      const result = storage.getStore();
      if (result === undefined) throw new ContextNotFoundError(name);
      return result.version;
    },
  };
  return ctx;
}

interface Trackable {
  version(): string;
}

type MemoReset = () => void;
const ContextMemo = new AsyncLocalStorage<{
  reset: MemoReset;
  deps: Trackable[];
}>();

export function memo<T>(cb: () => T) {
  const deps = [] as Trackable[];
  const cache = new Map<string, T>();
  const children = [] as MemoReset[];
  let tracked = false;

  function key() {
    return deps.map((dep) => dep.version()).join(",");
  }

  function reset() {
    cache.delete(key());
    for (const child of children) {
      child();
    }
  }

  function save(value: T) {
    cache.set(key(), value);
  }

  return () => {
    const child = ContextMemo.getStore();
    if (child) {
      child.deps.push({ version: () => key() });
      children.push(child.reset);
    }
    // Memo never run so build up dependency list
    if (!tracked) {
      return ContextMemo.run({ deps, reset }, () => {
        return runWithCleanup(cb, (result) => {
          tracked = true;
          save(result);
        });
      });
    }

    const cached = cache.get(key());
    if (cached) {
      return cached;
    }

    const result = cb();
    save(result);
    return result;
  };
}

function runWithCleanup<R>(cb: () => R, cleanup: (input: R) => void): R {
  const result = cb();
  if (
    result &&
    typeof result === "object" &&
    "then" in result &&
    typeof result.then === "function"
  ) {
    return result.then((value: R) => {
      // cleanup
      cleanup(result);
      return value;
    });
  }
  cleanup(result);
  return result;
}

export const Context = {
  create,
  memo,
};
