import { createProxy, getVariables } from "../util/index.js";
import { Context } from "../../context/context.js";
import { useEvent, Handler } from "../../context/handler.js";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export interface ApiResources {}
export interface AppSyncApiResources {}
export interface ApiGatewayV1ApiResources {}
export interface WebSocketApiResources {}

export const Api = createProxy<ApiResources>("Api");
export const AppSyncApi = createProxy<AppSyncApiResources>("AppSyncApi");
export const ApiGatewayV1Api =
  createProxy<ApiGatewayV1ApiResources>("ApiGatewayV1Api");
export const WebSocketApi = createProxy<WebSocketApiResources>("WebSocketApi");
Object.assign(Api, getVariables("Api"));
Object.assign(AppSyncApi, getVariables("AppSyncApi"));
Object.assign(ApiGatewayV1Api, getVariables("ApiGatewayV1Api"));
Object.assign(WebSocketApi, getVariables("WebSocketApi"));

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
  return Handler("api", async (evt, ctx) => {
    const result = await cb(evt, ctx);
    const serialized = useResponse().serialize(result || {});
    console.log(serialized);
    return serialized;
  });
}

export const useCookies = /* @__PURE__ */ Context.memo(() => {
  const evt = useEvent("api");
  const cookies = evt.cookies || [];
  return Object.fromEntries(
    cookies.map((c) => c.split("=")).map(([k, v]) => [k, decodeURIComponent(v)])
  );
});

export function useCookie(name: string) {
  const cookies = useCookies();
  return cookies[name] as string | undefined;
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

interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export const useResponse = /* @__PURE__ */ Context.memo(() => {
  const response: APIGatewayProxyStructuredResultV2 = {
    headers: {},
    cookies: [],
  };

  const result = {
    cookies(values: Record<string, string>, options: CookieOptions) {
      for (const [key, value] of Object.entries(values)) {
        result.cookie({
          key,
          value,
          ...options,
        });
      }
      return result;
    },
    cookie(
      input: {
        key: string;
        value: string;
      } & CookieOptions
    ) {
      const value = encodeURIComponent(input.value);
      const parts = [input.key + "=" + value];
      if (input.domain) parts.push("Domain=" + input.domain);
      if (input.path) parts.push("Path=" + input.path);
      if (input.expires) parts.push("Expires=" + input.expires.toUTCString());
      if (input.maxAge) parts.push("Max-Age=" + input.maxAge);
      if (input.httpOnly) parts.push("HttpOnly");
      if (input.secure) parts.push("Secure");
      if (input.sameSite) parts.push("SameSite=" + input.sameSite);
      response.cookies!.push(parts.join("; "));
      return result;
    },
    status(code: number) {
      response.statusCode = code;
      return result;
    },
    header(key: string, value: string) {
      response.headers![key] = value;
      return result;
    },
    serialize(
      input: APIGatewayProxyStructuredResultV2
    ): APIGatewayProxyStructuredResultV2 {
      return {
        ...response,
        ...input,
        cookies: [...(input.cookies || []), ...response.cookies!],
        headers: {
          ...response.headers,
          ...input.headers,
        },
      };
    },
  };
  return result;
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

export function useQueryParam<T = string>(name: string) {
  return useQueryParams()[name] as T | undefined;
}

export function usePathParams() {
  const evt = useEvent("api");
  const path = evt.pathParameters || {};
  return path;
}

export function usePathParam(name: string) {
  return usePathParams()[name];
}
