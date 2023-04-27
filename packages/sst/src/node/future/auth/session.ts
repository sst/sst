import { createSigner, createVerifier, SignerOptions } from "fast-jwt";
import { Context } from "../../../context/context.js";
import {
  useCookie as useApiCookie,
  useHeader as useApiHeader,
} from "../../api/index.js";
import { useHeader as useWebSocketHeader } from "../../websocket-api/index.js";
import { Auth } from "../../auth/index.js";
import { Config } from "../../config/index.js";
import { HandlerTypes, useContextType } from "../../../context/handler.js";

export interface SessionTypes {
  public: {};
}

export type SessionValue = {
  [type in keyof SessionTypes]: {
    type: type;
    properties: SessionTypes[type];
  };
}[keyof SessionTypes];

type Hooks = {
  useHeader: (name: string) => string | undefined;
  useCookie: (name: string) => string | undefined;
};

const hooksForContextTypes: Record<HandlerTypes, Hooks | undefined> = {
  api: { useHeader: useApiHeader, useCookie: useApiCookie },
  ws: { useHeader: useWebSocketHeader, useCookie: () => undefined },
  sqs: undefined,
};

const SessionMemo = /* @__PURE__ */ Context.memo(() => {
  // Get the context type and hooks that match that type
  const ctxType = useContextType();
  const hooks = hooksForContextTypes[ctxType];
  if (!hooks) {
    console.warn(
      `Invalid context type: ${ctxType} for auth, returning public session`
    );
    return {
      type: "public",
      properties: {},
    };
  }
  let token = "";

  const header = hooks.useHeader("authorization")!;
  if (header) token = header.substring(7);

  const cookie = hooks.useCookie("sst_auth_token");
  if (cookie) token = cookie;

  if (token) {
    return Session.verify(token);
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
  // This is the auth function accessing the public key
  if (process.env.AUTH_ID) {
    // @ts-expect-error
    const key = Config[process.env.AUTH_ID + "PublicKey"];
    if (key) return key as string;
  }
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
    try {
      const jwt = createVerifier({
        algorithms: ["RS512"],
        key: getPublicKey(),
      })(token);
      return jwt as T;
    } catch (e) {
      console.log(e);
    }
  }
  return {
    type: "public",
    properties: {},
  };
}

export const Session = {
  create,
  verify,
};
