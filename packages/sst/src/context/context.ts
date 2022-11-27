export const Context = {
  create,
  reset,
  memo,
};

const state = {
  requestID: "",
  contexts: new Map<any, ContextInfo>(),
  tracking: [] as any[],
};

interface ContextInfo {
  value: any;
  dependants: Set<any>;
}

function create<C>(cb?: (() => C) | string) {
  const id = Symbol(cb?.toString());
  return {
    use() {
      let result = state.contexts.get(id);

      if (!result) {
        if (!cb || typeof cb === "string")
          throw new Error(`"${String(id)}" context was not provided.`);
        state.tracking.push(id);
        const value = cb();
        state.tracking.pop();
        result = {
          value,
          dependants: new Set(),
        };
        state.contexts.set(id, result);
      }
      const last = state.tracking[state.tracking.length - 1];
      // Use is being called within another context booting up so mark it as a dependent
      if (last) result!.dependants.add(last);
      return result!.value as C;
    },
    provide(value: C) {
      // If a new request has started, automatically clear all contexts
      const requestID = (global as any)[
        Symbol.for("aws.lambda.runtime.requestId")
      ];
      if (state.requestID !== requestID) {
        state.requestID = requestID;
        reset();
      }

      // If the context is already set, we need to reset its dependants
      resetDependencies(id);

      state.contexts.set(id, {
        value,
        dependants: new Set(),
      });
    },
  };
}

function reset() {
  state.contexts.clear();
}

function resetDependencies(id: any) {
  const info = state.contexts.get(id);
  if (!info) return;
  for (const dependantID of info.dependants) {
    resetDependencies(dependantID);
    state.contexts.delete(dependantID);
  }
}

export function memo<C>(cb: () => C) {
  const ctx = create(cb);
  return ctx.use;
}
