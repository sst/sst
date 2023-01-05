import { Issuer } from "openid-client";
import { createAdapter } from "./adapter.js";
import { OauthAdapter } from "./oauth.js";
import { OidcAdapter } from "./oidc.js";
const issuer = await Issuer.discover("https://accounts.google.com");
export const GoogleAdapter = /* @__PURE__ */ createAdapter((config) => {
    if ("clientSecret" in config) {
        return OauthAdapter({
            issuer,
            ...config
        });
    }
    return OidcAdapter({
        issuer,
        scope: "openid email profile",
        ...config
    });
});
