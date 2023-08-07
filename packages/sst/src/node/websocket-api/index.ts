import { Handler, useEvent } from "../../context/handler.js";
import { useHeader } from "../api/index.js";
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
    // TODO: Once https://github.com/sst/sst/pull/2838 is merged,
    // then we should no longer need to check both casing for the header.
    const token =
      useHeader("Sec-WebSocket-Protocol") ||
      useHeader("sec-websocket-protocol");
    // If a token was set as part of the sec-websocket-protocol, we need to
    // return it as a header in the response.
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-connect-route-subprotocol.html
    if (token) {
      return {
        ...((result as any) || {}),
        headers: {
          "Sec-WebSocket-Protocol": token,
        },
      };
    }
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
