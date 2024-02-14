import { Issuer } from "openid-client";

import { OauthAdapter, OauthBasicConfig } from "./oauth.js";

// This adapter support the OAuth flow with the response_mode "form_post" for now.
// More details about the flow:
// https://developer.apple.com/documentation/devicemanagement/user_enrollment/onboarding_users_with_account_sign-in/implementing_the_oauth2_authentication_user-enrollment_flow
//
// Also note that Apple's discover uri does not work for the OAuth flow, as the
// userinfo_endpoint are not included in the response.
// await Issuer.discover("https://appleid.apple.com/.well-known/openid-configuration/");

const issuer = await Issuer.discover(
  "https://appleid.apple.com/.well-known/openid-configuration",
);

export const AppleAdapter =
  /* @__PURE__ */
  (config: OauthBasicConfig) => {
    return OauthAdapter({
      issuer,
      ...config,
      params: {
        ...config.params,
        response_mode: "form_post",
      },
    });
  };
