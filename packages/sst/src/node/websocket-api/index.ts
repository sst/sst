import { Handler, useEvent } from "../../context/handler.js";
import { createProxy } from "../util/index.js";

export interface WebSocketApiResources {}

export const WebSocketApi =
  /* @__PURE__ */ createProxy<WebSocketApiResources>("WebSocketApi");

/**
 * Create a new WebSocketApi handler that can be used to create an
 * authenticated session.
 *
 * @example
 * ```ts
 * export const handler = WebSocketApiHandler({
 * })
 * ```
 */
export function WebSocketApiHandler(cb: Parameters<typeof Handler<"ws">>[1]) {
  return Handler("ws", async (evt, ctx) => {
    const result = await cb(evt, ctx);
    return result;
  });
}

export function useRequestContext() {
  const evt = useEvent("ws");
  return evt.requestContext;
}

export function useConnectionId() {
  const requestContext = useRequestContext();
  return requestContext.connectionId;
}

export function useEventType() {
  const requestContext = useRequestContext();
  return requestContext.eventType;
}
