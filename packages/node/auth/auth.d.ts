import { Adapter } from "./adapter/adapter.js";
export declare function getPublicKey(): string;
export declare function getPrivateKey(): string;
export declare function getPrefix(): string;
/**
 * Create a new auth handler that can be used to create an authenticated session.
 *
 * @example
 * ```ts
 * export const handler = AuthHandler({
 *   providers: {
 *     google: {
 *       adapter: GoogleAdapter,
 *       clientId: "...",
 *       onSuccess: (claims) => {
 *       }
 *     }
 *   }
 * })
 * ```
 */
export declare function AuthHandler<Providers extends Record<string, Adapter>>(config: {
    providers: Providers;
}): (event: import("aws-lambda").APIGatewayProxyEventV2, context: import("aws-lambda").Context) => Promise<import("aws-lambda").APIGatewayProxyStructuredResultV2>;
