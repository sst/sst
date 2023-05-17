import { Issuer } from "openid-client";
import { Adapter } from "./adapter.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

// This is the common use for all Microsoft account logins (Business and privte accounts)
// Common: https://login.microsoftonline.com/common/v2.0
// Business: https://login.microsoftonline.com/{tenant}/v2.0
// Private: https://login.microsoftonline.com/consumers/v2.0

const issuer = await Issuer.discover("https://login.microsoftonline.com/common/v2.0");

type MicrosoftConfig = OidcBasicConfig & { mode: "oidc" };

export function MicrosoftAdapter(config: MicrosoftConfig) {
  return OidcAdapter({
    issuer,
    scope: "openid email profile",
    ...config,
  }) satisfies Adapter;
}
