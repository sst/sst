import { generators } from "openid-client";
import { useCookie, useDomainName, usePath, useQueryParams, } from "../../api/index.js";
import { createAdapter } from "./adapter.js";
export const OauthAdapter = /* @__PURE__ */ createAdapter((config) => {
    return async function () {
        const [step] = usePath().slice(-1);
        const callback = "https://" +
            [useDomainName(), ...usePath().slice(0, -1), "callback"].join("/");
        const client = new config.issuer.Client({
            client_id: config.clientID,
            client_secret: config.clientSecret,
            redirect_uris: [callback],
            response_types: ["code"],
        });
        if (step === "authorize") {
            const code_verifier = generators.codeVerifier();
            const state = generators.state();
            const code_challenge = generators.codeChallenge(code_verifier);
            const url = client.authorizationUrl({
                scope: config.scope,
                code_challenge: code_challenge,
                code_challenge_method: "S256",
                state,
                prompt: config.prompt,
            });
            const expires = new Date(Date.now() + 1000 * 30).toUTCString();
            return {
                statusCode: 302,
                cookies: [
                    `auth-code-verifier=${code_verifier}; HttpOnly; expires=${expires}`,
                    `auth-state=${state}; HttpOnly; expires=${expires}`,
                ],
                headers: {
                    location: url,
                },
            };
        }
        if (step === "callback") {
            const params = useQueryParams();
            const code_verifier = useCookie("auth-code-verifier");
            const state = useCookie("auth-state");
            const tokenset = await client[config.issuer.metadata.userinfo_endpoint
                ? "callback"
                : "oauthCallback"](callback, params, {
                code_verifier,
                state,
            });
            return config.onSuccess(tokenset, client);
        }
        throw new Error("Invalid auth request");
    };
});
