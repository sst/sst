import { Handler } from "../context/handler.js";
import { usePath } from "../context/http.js";
import { Adapter } from "./adapter/adapter.js";

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
    if (path.join("/") === process.env.SST_AUTH_PREFIX) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          Object.keys(config.providers).map(
            (x) => `${process.env.SST_AUTH_PREFIX}/${x}/authorize`
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
