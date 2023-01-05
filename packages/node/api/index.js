import { createProxy, parseEnvironment } from "../util/index.js";
import { Context } from "../context/context.js";
import { useEvent, Handler } from "../context/handler.js";
export const Api = createProxy("Api");
export const AppSyncApi = createProxy("AppSyncApi");
export const ApiGatewayV1Api = createProxy("ApiGatewayV1Api");
export const WebSocketApi = createProxy("WebSocketApi");
export const GraphQLApi = createProxy("GraphQLApi");
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
export function ApiHandler(cb) {
    return Handler("api", cb);
}
export const useCookies = /* @__PURE__ */ Context.memo(() => {
    const evt = useEvent("api");
    const cookies = evt.cookies || [];
    return Object.fromEntries(cookies.map((c) => c.split("=")));
});
export function useCookie(name) {
    const cookies = useCookies();
    return cookies[name];
}
export const useBody = /* @__PURE__ */ Context.memo(() => {
    const evt = useEvent("api");
    if (!evt.body)
        return;
    const body = evt.isBase64Encoded
        ? Buffer.from(evt.body, "base64").toString()
        : evt.body;
    return body;
});
export const useJsonBody = /* @__PURE__ */ Context.memo(() => {
    const body = useBody();
    if (!body)
        return;
    return JSON.parse(body);
});
export const useFormData = /* @__PURE__ */ Context.memo(() => {
    const body = useBody();
    if (!body)
        return;
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
export function useHeader(key) {
    const headers = useHeaders();
    return headers[key];
}
export function useFormValue(name) {
    const params = useFormData();
    return params?.get(name);
}
export function useQueryParams() {
    const evt = useEvent("api");
    const query = evt.queryStringParameters || {};
    return query;
}
export function useQueryParam(name) {
    return useQueryParams()[name];
}
