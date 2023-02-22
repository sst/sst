import { createSigner, createVerifier, SignerOptions } from "fast-jwt";
import { Context } from "../../context/context.js";
import { useCookie, useHeader } from "../api/index.js";
import { Auth } from "../auth/index.js";
import { Config } from "../config/index.js";

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
  let token = "";

  const header = useHeader("authorization")!;
  if (header) token = header.substring(7);

  const cookie = useCookie("auth-token");
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

function getPublicKey() {
  const [first] = Object.values(Auth);
  if (!first)
    throw new Error("No auth provider found. Did you forget to add one?");
  return first.publicKey;
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
  // @ts-expect-error
  const key = Config[process.env.AUTH_ID + "PrivateKey"];
  const signer = createSigner({
    ...input.options,
    key,
    algorithm: "RS512",
  });
  const token = signer({
    type: input.type,
    properties: input.properties,
  });
  return token as string;
}

/**
 * Verifies a session token and returns the session data
 *
 * @example
 * ```js
 * Session.verify()
 * ```
 */
function verify<T = SessionValue>(token: string) {
  if (token) {
    const jwt = createVerifier({
      algorithms: ["RS512"],
      key: getPublicKey(),
    })(token);
    return jwt as T;
  }
}

export const Session = {
  create,
  verify,
};
