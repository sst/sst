import { createSigner, createVerifier, SignerOptions } from "fast-jwt";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { Context } from "../../context/context.js";
import { ApiHandlerTypes, useCookie, useHeader } from "../api/index.js";
import { getPrivateKey, getPublicKey } from "./auth.js";
import { useContextType } from "../../context/handler.js";

export interface SessionTypes {
  public: {};
}

export type SessionValue = {
  [type in keyof SessionTypes]: {
    type: type;
    properties: SessionTypes[type];
  };
}[keyof SessionTypes];

const SessionMemo = /* @__PURE__ */ Context.memo(() => {
  // Get the context type and hooks that match that type
  const ctxType = useContextType();
  let token = "";

  const header = useHeader("authorization", ctxType as ApiHandlerTypes)!;
  if (header) token = header.substring(7);

  const cookie = ctxType === "api" ? useCookie("auth-token") : undefined;
  if (cookie) token = cookie;

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
export function useSession<T = SessionValue>() {
  const ctx = SessionMemo();
  return ctx as T;
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
function create<T extends keyof SessionTypes>(input: {
  type: T;
  properties: SessionTypes[T];
  options?: Partial<SignerOptions>;
}) {
  const signer = createSigner({
    ...input.options,
    key: getPrivateKey(),
    algorithm: "RS512",
  });
  const token = signer({
    type: input.type,
    properties: input.properties,
  });
  return token as string;
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
export function cookie<T extends keyof SessionTypes>(input: {
  type: T;
  properties: SessionTypes[T];
  redirect: string;
  options?: Partial<SignerOptions>;
}): APIGatewayProxyStructuredResultV2 {
  const token = create(input);
  const expires = new Date(
    Date.now() + (input.options?.expiresIn || 1000 * 60 * 60 * 24 * 7)
  );
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
export function parameter<T extends keyof SessionTypes>(input: {
  type: T;
  redirect: string;
  properties: SessionTypes[T];
  options?: Partial<SignerOptions>;
}): APIGatewayProxyStructuredResultV2 {
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
