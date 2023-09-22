import { Context } from "../../context/context2.js";

const LoaderContext = Context.memo(() => {
  const loaders = new Map<any, any>();
  return loaders;
});

export function createLoader<Key, Value>(
  batchFn: (keys: Key[]) => Promise<Value[]>
) {
  interface Batch {
    keys: Key[];
    promises: ((val: Value) => void)[];
  }

  let current: Batch | undefined;

  async function run() {
    const batch = current;
    if (!batch) return;
    const result = await batchFn(batch.keys);
    for (let i = 0; i < result.length; i++) {
      batch.promises[i](result[i]);
    }
    current = undefined;
  }

  function getBatch() {
    if (current) return current;
    process.nextTick(run);
    current = {
      keys: [] as Key[],
      promises: [] as ((val: Value) => void)[],
    };
    return current;
  }

  return (key: Key) => {
    const batch = getBatch();
    batch.keys.push(key);
    const promise = new Promise<Value>((resolve, reject) => {
      batch.promises.push((val: any) => {
        if (val instanceof Error) {
          reject(val);
          return;
        }
        resolve(val);
      });
    });
    return promise;
  };
}

export function useLoader<Key, Value>(
  key: any,
  batchFn: (keys: Key[]) => Promise<Value[]>
) {
  const loaders = LoaderContext();
  if (loaders.has(key)) {
    return loaders.get(key) as (key: Key) => Promise<Value>;
  }
  const loader = createLoader(batchFn);
  loaders.set(key, loader);
  return loader as (key: Key) => Promise<Value>;
}
