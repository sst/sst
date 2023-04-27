import { Context } from "../../context/context.js";
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

export const useBody = /* @__PURE__ */ Context.memo(() => {
  const evt = useEvent("ws");
  if (!evt.body) return;
  const body = evt.isBase64Encoded
    ? Buffer.from(evt.body, "base64").toString()
    : evt.body;
  return body;
});

export const useJsonBody = /* @__PURE__ */ Context.memo(() => {
  const body = useBody();
  if (!body) return;
  return JSON.parse(body);
});

export function useRequestContext() {
  const evt = useEvent("ws");
  return evt.requestContext;
}

export function useDomainName() {
  const requestContext = useRequestContext();
  return requestContext.domainName;
}

export function useConnectionId() {
  const requestContext = useRequestContext();
  return requestContext.connectionId;
}

export function useEventType() {
  const requestContext = useRequestContext();
  return requestContext.eventType;
}

export function useHeaders() {
  const evt = useEvent("ws");
  return evt.headers || {};
}

export function useHeader(key: string) {
  const headers = useHeaders();
  return headers[key];
}

export function useQueryParams() {
  const evt = useEvent("ws");
  const query = evt.queryStringParameters || {};
  return query;
}

export function useQueryParam<T = string>(name: string) {
  return useQueryParams()[name] as T | undefined;
}
