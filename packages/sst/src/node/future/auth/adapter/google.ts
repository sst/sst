import {BaseClient, Issuer} from "openid-client";
import { OidcAdapter, OidcBasicConfig } from "./oidc.js";
import { OauthAdapter, OauthBasicConfig } from "./oauth.js";

let realIssuer: Issuer<BaseClient>;

const issuer = new Proxy({}, {
    get: async function(target, prop: string){
        if(!realIssuer){
            realIssuer = await Issuer.discover("https://accounts.google.com");
        }
        return realIssuer[prop];
    }
})

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
        issuer: issuer as Issuer<BaseClient>,
      ...config,
      params: {
        ...(config.accessType && { access_type: config.accessType }),
        ...config.params,
      },
    });
  }
  return OidcAdapter({
    issuer: issuer as Issuer<BaseClient>,
    scope: "openid email profile",
    ...config,
  });
}
