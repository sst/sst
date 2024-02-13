import { Issuer } from "openid-client";
import { OauthAdapter, OauthBasicConfig } from "./oauth.js";

const issuer = new Issuer({
  issuer: "https://accounts.spotify.com",
  authorization_endpoint: "https://accounts.spotify.com/authorize",
  token_endpoint: "https://accounts.spotify.com/api/token",
});

/**
 * The Spotify Adapter follows the PKCE flow outlined here:
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 *
 * List of scopes available:
 * https://developer.spotify.com/documentation/web-api/concepts/scopes
 */
export const SpotifyAdapter =
  /* @__PURE__ */
  (config: OauthBasicConfig) => {
    return OauthAdapter({
      issuer,
      ...config,
    });
  };
