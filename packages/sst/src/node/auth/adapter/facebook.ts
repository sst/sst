import { Issuer } from "openid-client";
import { createAdapter } from "./adapter.js";
import { OauthAdapter, OauthBasicConfig } from "./oauth.js";

// Facebook's OIDC flow returns "id_token" as uri hash in redirect uri. Hashes
// are not passed to Lambda event object. It is likely that Facebook only wants
// to support redirecting to a frontend uri.
//
// We are only going to suppor the OAuth flow for now. More details about the flow:
// https://developers.facebook.com/docs/facebook-login/guides/advanced/oidc-token
//
// Also note that Facebook's discover uri does not work for the OAuth flow, as the
// token_endpoint and userinfo_endpoint are not included in the response.
// await Issuer.discover("https://www.facebook.com/.well-known/openid-configuration/");

const issuer = new Issuer({
  issuer: "https://www.facebook.com",
  authorization_endpoint: "https://facebook.com/dialog/oauth/",
  jwks_uri: "https://www.facebook.com/.well-known/oauth/openid/jwks/",
  token_endpoint: "https://graph.facebook.com/oauth/access_token",
  userinfo_endpoint: "https://graph.facebook.com/oauth/access_token",
});

export const FacebookAdapter = /* @__PURE__ */ createAdapter(
  (config: OauthBasicConfig) => {
    return OauthAdapter({
      issuer,
      ...config,
    });
  }
);
