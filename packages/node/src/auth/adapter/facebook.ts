import { Issuer } from "openid-client";
import { createAdapter } from "./adapter.js";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";

const issuer = await Issuer.discover("https://www.facebook.com/.well-known/openid-configuration/");

type FacebookConfig = (OidcBasicConfig & { mode: "oidc" });

export const FacebookAdapter = /* @__PURE__ */ createAdapter(
  (config: FacebookConfig) => {
    return OidcAdapter({
      issuer,
      scope: "openid email",
      ...config
    });
  }
);
