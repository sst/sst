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
    version: number;
  }>();

  const memos = [] as MemoReset[];
  function reset() {
    for (const memo of memos) {
      memo();
    }
  }

  const ctx = {
    name,
    with<R>(value: T, cb: () => R) {
      const version = ++count;
      return storage.run({ value, version }, () => {
        return runWithCleanup(cb, () => reset());
      });
    },
    use() {
      const memo = ContextMemo.getStore();
      if (memo) {
        memo.deps.push(ctx);
        memos.push(memo.reset);
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

type MemoReset = () => void;
const ContextMemo = new AsyncLocalStorage<{
  reset: MemoReset;
  deps: Context<any>[];
}>();

export function memo<T>(cb: () => T) {
  const deps = [] as Context<any>[];
  const cache = new Map<string, T>();
  let tracked = false;

  function key() {
    return deps.map((dep) => dep.version()).join(",");
  }

  function reset() {
    cache.delete(key());
  }

  function save(value: T) {
    cache.set(key(), value);
  }

  return () => {
    if (!tracked) {
      console.log("tracking");
      return ContextMemo.run({ deps, reset }, () => {
        return runWithCleanup(cb, (result) => {
          tracked = true;
          save(result);
        });
      });
    }

    const cached = cache.get(key());
    if (cached) return cached;

    const result = cb();
    save(result);
    return result;
  };
}

function runWithCleanup<R>(cb: () => R, cleanup: (input: R) => void) {
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
