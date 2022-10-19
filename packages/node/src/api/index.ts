import { createProxy, parseEnvironment } from "../util";
import { Context } from "../context/context.js";
import { useEvent, Handler } from "../context/handler.js";

export interface ApiResources { }
export interface AppSyncApiResources { }
export interface ApiGatewayV1ApiResources { }
export interface WebSocketApiResources { }
export interface GraphQLApiResources { }

export const Api = createProxy<ApiResources>("Api");
export const AppSyncApi = createProxy<AppSyncApiResources>("AppSyncApi");
export const ApiGatewayV1Api = createProxy<ApiGatewayV1ApiResources>("ApiGatewayV1Api");
export const WebSocketApi = createProxy<WebSocketApiResources>("WebSocketApi");
export const GraphQLApi = createProxy<GraphQLApiResources>("GraphQLApi");
Object.assign(Api, parseEnvironment("Api", ["url"]));
Object.assign(AppSyncApi, parseEnvironment("AppSyncApi", ["url"]));
Object.assign(ApiGatewayV1Api, parseEnvironment("ApiGatewayV1Api", ["url"]));
Object.assign(WebSocketApi, parseEnvironment("WebSocketApi", ["url"]));
Object.assign(GraphQLApi, parseEnvironment("GraphQLApi", ["url"]));

/**
 * Create a new api handler that can be used to create an authenticated session.
 *
 * @example
 * ```ts
 * export const handler = ApiHandler({
 * })
 * ```
 */
export function ApiHandler(cb: Parameters<typeof Handler<"api">>[1]) {
  return Handler("api", cb);
}

export const useCookies = /* @__PURE__ */ Context.memo(() => {
  const evt = useEvent("api");
  const cookies = evt.cookies || [];
  return Object.fromEntries(cookies.map((c) => c.split("=")));
});

export function useCookie(name: string) {
  const cookies = useCookies();
  return cookies[name];
}

export const useBody = /* @__PURE__ */ Context.memo(() => {
  const evt = useEvent("api");
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

export const useFormData = /* @__PURE__ */ Context.memo(() => {
  const body = useBody();
  if (!body) return;
  const params = new URLSearchParams(body);
  return params;
});

export const usePath = /* @__PURE__ */ Context.memo(() => {
  const evt = useEvent("api");
  return evt.rawPath.split("/").filter(Boolean);
});

export function useDomainName() {
  const evt = useEvent("api");
  return evt.requestContext.domainName;
}

export function useMethod() {
  const evt = useEvent("api");
  return evt.requestContext.http.method;
}

export function useHeaders() {
  const evt = useEvent("api");
  return evt.headers || {};
}

export function useHeader(key: string) {
  const headers = useHeaders();
  return headers[key];
}

export function useFormValue(name: string) {
  const params = useFormData();
  return params?.get(name);
}

export function useQueryParams() {
  const evt = useEvent("api");
  const query = evt.queryStringParameters || {};
  return query;
}

export function useQueryParam(name: string) {
  return useQueryParams()[name];
}