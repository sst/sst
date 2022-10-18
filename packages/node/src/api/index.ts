import { createProxy, parseEnvironment } from "../util";

export interface ApiResources { }
export interface AppSyncApiResources { }
export interface ApiGatewayV1ApiResources { }
export interface WebSocketApiResources { }

export const Api = createProxy<ApiResources>("Api");
export const AppSyncApi = createProxy<AppSyncApiResources>("AppSyncApi");
export const ApiGatewayV1Api = createProxy<ApiGatewayV1ApiResources>("ApiGatewayV1Api");
export const WebSocketApi = createProxy<WebSocketApiResources>("WebSocketApi");
Object.assign(Api, parseEnvironment("Api", ["url"]));
Object.assign(AppSyncApi, parseEnvironment("AppSyncApi", ["url"]));
Object.assign(ApiGatewayV1Api, parseEnvironment("ApiGatewayV1Api", ["url"]));
Object.assign(WebSocketApi, parseEnvironment("WebSocketApi", ["url"]));