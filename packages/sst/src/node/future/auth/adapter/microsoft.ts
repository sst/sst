import { Issuer } from "openid-client";
import { Adapter } from "./adapter.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

// These are the different Microsoft auth urls for different types of accounts:
// Common: https://login.microsoftonline.com/common/v2.0 (both business and private)
// Business: https://login.microsoftonline.com/{tenant}/v2.0
// Private: https://login.microsoftonline.com/consumers/v2.0

const issuer = await Issuer.discover(
  "https://login.microsoftonline.com/common/v2.0"
);

type MicrosoftConfig = OidcBasicConfig & {
  mode: "oidc";
  prompt?: "login" | "none" | "consent" | "select_account";
};

export function MicrosoftAdapter(config: MicrosoftConfig) {
  return OidcAdapter({
    issuer,
    scope: "openid email profile",
    ...config,
  }) satisfies Adapter;
}
