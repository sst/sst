export const Context = {
    create,
    reset,
    memo,
};
const state = {
    requestID: "",
    contexts: new Map(),
    tracking: [],
};
function create(cb) {
    const id = Symbol();
    return {
        use() {
            let result = state.contexts.get(id);
            if (!result) {
                if (!cb)
                    throw new Error(`"${String(id)}" context must be provided.`);
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
            if (last)
                result.dependants.add(last);
            return result.value;
        },
        provide(value) {
            // If a new request has started, automatically clear all contexts
            const requestID = global[Symbol.for("aws.lambda.runtime.requestId")];
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
function resetDependencies(id) {
    const info = state.contexts.get(id);
    if (!info)
        return;
    for (const dependantID of info.dependants) {
        resetDependencies(dependantID);
        state.contexts.delete(dependantID);
    }
}
export function memo(cb) {
    const ctx = create(cb);
    return ctx.use;
}
5;
