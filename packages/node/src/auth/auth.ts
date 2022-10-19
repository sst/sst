import { Handler } from "../context/handler.js";
import { useDomainName, usePath } from "../api/index.js";
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
    const prefix = process.env.SST_AUTH_PREFIX?.split("/")
      .filter(Boolean)
      .join("/");
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
