import { Issuer } from "openid-client";
import { Adapter } from "./adapter.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

const issuer = await Issuer.discover("https://accounts.google.com");

type GoogleConfig = OidcBasicConfig & {
  mode: "oidc";
  prompt?: "none" | "consent" | "select_account";
};

export function GoogleAdapter(config: GoogleConfig) {
  return OidcAdapter({
    issuer,
    scope: "openid email profile",
    ...config,
  }) satisfies Adapter;
}
