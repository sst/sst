import { Issuer } from "openid-client";
import { OauthAdapter, OauthBasicConfig } from "./oauth.js";

const issuer = new Issuer({
  issuer: "https://github.com",
  authorization_endpoint: "https://github.com/login/oauth/authorize",
  token_endpoint: "https://github.com/login/oauth/access_token",
});

type Config = OauthBasicConfig;
export const GithubAdapter =
  /* @__PURE__ */
  (config: Config) => {
    return OauthAdapter({
      issuer,
      ...config,
    });
  };
