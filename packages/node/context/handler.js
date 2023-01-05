import { Context } from "./context.js";
const RequestContext = Context.create();
export function useEvent(type) {
    const ctx = RequestContext.use();
    if (ctx.type !== type)
        throw new Error(`Expected ${type} event`);
    return ctx.event;
}
export function useLambdaContext() {
    const ctx = RequestContext.use();
    return ctx.context;
}
export function Handler(type, cb) {
    return function handler(event, context) {
        RequestContext.provide({ type, event: event, context });
        return cb(event, context);
    };
}
