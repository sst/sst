import { Issuer } from "openid-client";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";
import { OauthAdapter, OauthBasicConfig } from "./oauth.js";

const issuer = await Issuer.discover("https://accounts.google.com");

type GooglePrompt = "none" | "consent" | "select_account";
type GoogleAccessType = "offline" | "online";

type GoogleConfig =
  | (OauthBasicConfig & {
      mode: "oauth";
      prompt?: GooglePrompt;
      accessType?: GoogleAccessType;
    })
  | (OidcBasicConfig & { mode: "oidc"; prompt?: GooglePrompt });

export function GoogleAdapter(config: GoogleConfig) {
  /* @__PURE__ */
  if (config.mode === "oauth") {
    return OauthAdapter({
      issuer,
      ...config,
      params: {
        ...(config.accessType && { access_type: config.accessType }),
        ...config.params,
      },
    });
  }
  return OidcAdapter({
    issuer,
    scope: "openid email profile",
    ...config,
  });
}
