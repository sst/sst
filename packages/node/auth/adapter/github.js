import { Issuer } from "openid-client";
import { createAdapter } from "./adapter.js";
import { OauthAdapter } from "./oauth.js";
import { OidcAdapter } from "./oidc.js";
const issuer = new Issuer({
    issuer: "https://github.com",
    authorization_endpoint: "https://github.com/login/oauth/authorize",
    token_endpoint: "https://github.com/login/oauth/access_token"
});
export const GithubAdapter = /* @__PURE__ */ createAdapter((config) => {
    if ("clientSecret" in config) {
        return OauthAdapter({
            issuer,
            ...config
        });
    }
    return OidcAdapter({
        issuer,
        ...config
    });
});
