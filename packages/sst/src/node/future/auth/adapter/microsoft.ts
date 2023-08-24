import { Issuer } from "openid-client";
import { Adapter } from "./adapter.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

// These are the different Microsoft auth urls for different types of accounts:
// Common: https://login.microsoftonline.com/common/v2.0 (both business and private)
// Business: https://login.microsoftonline.com/{tenant}/v2.0
// Private: https://login.microsoftonline.com/consumers/v2.0

type MicrosoftConfig = OidcBasicConfig & {
  mode: "oidc";
  prompt?: "login" | "none" | "consent" | "select_account";
  tenantID?: string;
};

export function MicrosoftAdapter(config: MicrosoftConfig) {
  const authority = config?.tenantID ?? "common";
  const issuer = `https://login.microsoftonline.com/${authority}`;

  return OidcAdapter({
    issuer: new Issuer({
      issuer: `${issuer}/v2.0`,
      authorization_endpoint: `${issuer}/oauth2/v2.0/authorize`,
      token_endpoint: `${issuer}/oauth2/v2.0/token`,
      jwks_uri: `${issuer}/discovery/v2.0/keys`,
    }),
    scope: "openid email profile",
    ...config,
  }) satisfies Adapter;
}
