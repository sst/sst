import { Issuer } from "openid-client";
import { createAdapter } from "./adapter.js";
import { OauthAdapter, OauthBasicConfig } from "./oauth.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

const issuer = await Issuer.discover("https://accounts.google.com");

type GoogleConfig =
  | (OauthBasicConfig & { mode: "oauth" })
  | (OidcBasicConfig & { mode: "oidc" });

export const GoogleAdapter = /* @__PURE__ */ createAdapter(
  (config: GoogleConfig) => {
    if ("clientSecret" in config) {
      return OauthAdapter({
        issuer,
        ...config,
      });
    }
    return OidcAdapter({
      issuer,
      scope: "openid email profile",
      ...config,
    });
  }
);
