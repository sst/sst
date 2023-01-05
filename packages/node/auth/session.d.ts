import { SignerOptions } from "fast-jwt";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
export interface SessionTypes {
    public: {};
}
export declare type SessionValue = {
    [type in keyof SessionTypes]: {
        type: type;
        properties: SessionTypes[type];
    };
}[keyof SessionTypes];
export declare function useSession<T = SessionValue>(): T;
/**
 * Creates a new session token with provided information
 *
 * @example
 * ```js
 * Session.create({
 *   type: "user",
 *   properties: {
 *     userID: "123"
 *   }
 * })
 * ```
 */
declare function create<T extends keyof SessionTypes>(input: {
    type: T;
    properties: SessionTypes[T];
    options?: Partial<SignerOptions>;
}): string;
/**
 * Returns a 302 redirect with an auth-token cookie set with the provided session information
 *
 * @example
 * ```js
 * Session.cookie({
 *   type: "user",
 *   properties: {
 *     userID: "123"
 *   },
 *   redirect: "https://app.example.com/"
 * })
 * ```
 */
export declare function cookie<T extends keyof SessionTypes>(input: {
    type: T;
    properties: SessionTypes[T];
    redirect: string;
    options?: Partial<SignerOptions>;
}): APIGatewayProxyStructuredResultV2;
/**
 * Returns a 302 redirect with a query parameter named token set with the jwt value
 *
 * @example
 * ```js
 * Session.parameter({
 *   type: "user",
 *   properties: {
 *     userID: "123"
 *   },
 *   redirect: "https://app.example.com/"
 * })
 * ```
 */
export declare function parameter<T extends keyof SessionTypes>(input: {
    type: T;
    redirect: string;
    properties: SessionTypes[T];
    options?: Partial<SignerOptions>;
}): APIGatewayProxyStructuredResultV2;
export declare const Session: {
    create: typeof create;
    cookie: typeof cookie;
    parameter: typeof parameter;
};
export {};
