import { createProxy, parseEnvironment } from "../util";
export const Api = createProxy("Api");
export const AppSyncApi = createProxy("AppSyncApi");
export const ApiGatewayV1Api = createProxy("ApiGatewayV1Api");
export const WebSocketApi = createProxy("WebSocketApi");
Object.assign(Api, parseEnvironment("Api", ["url"]));
Object.assign(AppSyncApi, parseEnvironment("AppSyncApi", ["url"]));
Object.assign(ApiGatewayV1Api, parseEnvironment("ApiGatewayV1Api", ["url"]));
Object.assign(WebSocketApi, parseEnvironment("WebSocketApi", ["url"]));
