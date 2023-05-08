import { getVariables2 } from "../util/index.js";
import { Handler } from "../../context/handler.js";
import { useDomainName, usePath } from "../api/index.js";
import { Adapter } from "./adapter/adapter.js";

const className = "Auth";

// Each function can only be attached to one Auth construct, so we can
// assume there is only one entry in authData.
const authData = getVariables2(className);
const authValues = Object.values(authData);
let prefix: string;
let publicKey: string;
let privateKey: string;
if (authValues.length !== 0) {
  prefix = authValues[0].prefix;
  publicKey = authValues[0].publicKey;
  privateKey = authValues[0].privateKey;
}

export function getPublicKey() {
  if (!publicKey) {
    throw new Error(
      `Cannot use ${className}.publicKey. Please make sure it is bound to this function.`
    );
  }
  return publicKey;
}

export function getPrivateKey() {
  if (!privateKey) {
    throw new Error(
      `Cannot use ${className}.privateKey. Please make sure it is bound to this function.`
    );
  }
  return privateKey;
}

export function getPrefix() {
  if (!prefix) {
    throw new Error(
      `Cannot use ${className}.prefix. Please make sure it is bound to this function.`
    );
  }
  return prefix;
}

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
export function AuthHandler<Providers extends Record<string, Adapter>>(config: {
  providers: Providers;
}) {
  return Handler("api", async () => {
    const path = usePath();
    const prefix = getPrefix().split("/").filter(Boolean).join("/");
    if (path.join("/") === prefix) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          Object.fromEntries(
            Object.keys(config.providers).map((x) => [
              x,
              `https://${useDomainName()}/${prefix}/${x}/authorize`,
            ])
          ),
          null,
          4
        ),
      };
    }
    const [providerName] = path.slice(-2);
    const provider = config.providers[providerName];
    if (!provider) throw new Error("No matching provider found");
    return provider();
  });
}
