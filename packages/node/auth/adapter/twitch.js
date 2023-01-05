import { Issuer } from "openid-client";
import { createAdapter } from "./adapter.js";
import { OidcAdapter } from "./oidc.js";
const issuer = await Issuer.discover("https://id.twitch.tv/oauth2");
export const TwitchAdapter = /* @__PURE__ */ createAdapter((config) => {
    return OidcAdapter({
        issuer,
        scope: "openid",
        ...config
    });
});
