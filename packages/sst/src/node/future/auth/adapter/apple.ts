import querystring from 'node:querystring';
import { generators, Issuer } from 'openid-client';

import { useBody, useCookie, useDomainName, usePathParam, useResponse } from '../../../api/index.js';
import { Adapter } from './adapter.js';
import { OauthConfig } from './oauth.js';

// This adapter support the OAuth flow with the response_mode "form_post" for now.
// More details about the flow:
// https://developer.apple.com/documentation/devicemanagement/user_enrollment/onboarding_users_with_account_sign-in/implementing_the_oauth2_authentication_user-enrollment_flow
//
// Also note that Apple's discover uri does not work for the OAuth flow, as the
// userinfo_endpoint are not included in the response.
// await Issuer.discover("https://appleid.apple.com/.well-known/openid-configuration/");

const issuer = await Issuer.discover(
  "https://appleid.apple.com/.well-known/openid-configuration"
)

export const AppleAdapter =
  /* @__PURE__ */
  (config: OauthConfig) => {
    return async function () {
      const step = usePathParam("step");
      const callback = "https://" + useDomainName() + "/callback";
      console.log("callback", callback);

      const client = new issuer.Client({
        client_id: config.clientID,
        client_secret: config.clientSecret,
        redirect_uris: [callback],
        response_types: ["code"],
      });

      if (step === "authorize" || step === "connect") {
        const code_verifier = generators.codeVerifier();
        const state = generators.state();
        const code_challenge = generators.codeChallenge(code_verifier);

        const url = client.authorizationUrl({
          scope: config.scope,
          code_challenge: code_challenge,
          code_challenge_method: "S256",
          state,
          prompt: config.prompt,
          ...config.params,
        });

        useResponse().cookies(
          {
            auth_code_verifier: code_verifier,
            auth_state: state,
          },
          {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 10,
            sameSite: "None",
          }
        );
        return {
          type: "step",
          properties: {
            statusCode: 302,
            headers: {
              location: url,
            },
          },
        };
      }

      if (step === "callback") {
        let params = {}
        if (config && config.params && config.params.response_mode === "form_post") {
          const body = useBody()
          if (typeof body === "string") {
            params = querystring.parse(body)
          }
        }

        const code_verifier = useCookie("auth_code_verifier");
        const state = useCookie("auth_state");
        const tokenset = await client["callback"](callback, params, {
          code_verifier,
          state,
        });
        const x = {
          type: "success" as const,
          properties: {
            tokenset,
            client,
          },
        };
        return x;
      }
    } satisfies Adapter;
  };
