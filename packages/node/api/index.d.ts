/// <reference types="node" />
import { Handler } from "../context/handler.js";
export interface ApiResources {
}
export interface AppSyncApiResources {
}
export interface ApiGatewayV1ApiResources {
}
export interface WebSocketApiResources {
}
export interface GraphQLApiResources {
}
export declare const Api: ApiResources;
export declare const AppSyncApi: AppSyncApiResources;
export declare const ApiGatewayV1Api: ApiGatewayV1ApiResources;
export declare const WebSocketApi: WebSocketApiResources;
export declare const GraphQLApi: GraphQLApiResources;
/**
 * Create a new api handler that can be used to create an authenticated session.
 *
 * @example
 * ```ts
 * export const handler = ApiHandler({
 * })
 * ```
 */
export declare function ApiHandler(cb: Parameters<typeof Handler<"api">>[1]): (event: import("aws-lambda").APIGatewayProxyEventV2, context: import("aws-lambda").Context) => Promise<import("aws-lambda").APIGatewayProxyStructuredResultV2>;
export declare const useCookies: () => any;
export declare function useCookie(name: string): any;
export declare const useBody: () => string | undefined;
export declare const useJsonBody: () => any;
export declare const useFormData: () => import("url").URLSearchParams | undefined;
export declare const usePath: () => string[];
export declare function useDomainName(): string;
export declare function useMethod(): string;
export declare function useHeaders(): import("aws-lambda").APIGatewayProxyEventHeaders;
export declare function useHeader(key: string): string | undefined;
export declare function useFormValue(name: string): string | null | undefined;
export declare function useQueryParams(): import("aws-lambda").APIGatewayProxyEventQueryStringParameters;
export declare function useQueryParam(name: string): string | undefined;
