import { createSigner, createVerifier } from "fast-jwt";
import { Context } from "../context/context.js";
import { useCookie, useHeader } from "../api/index.js";
import { getPrivateKey, getPublicKey } from "./auth.js";
const SessionMemo = /* @__PURE__ */ Context.memo(() => {
    let token = "";
    const header = useHeader("authorization");
    if (header)
        token = header.substring(7);
    const cookie = useCookie("auth-token");
    if (cookie)
        token = cookie;
    if (token) {
        const jwt = createVerifier({
            algorithms: ["RS512"],
            key: getPublicKey(),
        })(token);
        return jwt;
    }
    return {
        type: "public",
        properties: {},
    };
});
// This is a crazy TS hack to prevent the types from being evaluated too soon
export function useSession() {
    const ctx = SessionMemo();
    return ctx;
}
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
function create(input) {
    const signer = createSigner({
        ...input.options,
        key: getPrivateKey(),
        algorithm: "RS512",
    });
    const token = signer({
        type: input.type,
        properties: input.properties,
    });
    return token;
}
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
export function cookie(input) {
    const token = create(input);
    const expires = new Date(Date.now() + (input.options?.expiresIn || 1000 * 60 * 60 * 24 * 7));
    return {
        statusCode: 302,
        headers: {
            location: input.redirect,
        },
        cookies: [
            `auth-token=${token}; HttpOnly; SameSite=None; Secure; Path=/; Expires=${expires}`,
        ],
    };
}
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
export function parameter(input) {
    const token = create(input);
    return {
        statusCode: 302,
        headers: {
            location: input.redirect + "?token=" + token,
        },
    };
}
export const Session = {
    create,
    cookie,
    parameter,
};
