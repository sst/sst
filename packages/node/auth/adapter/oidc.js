import { generators } from "openid-client";
import { useCookie, useDomainName, useFormData, usePath, } from "../../api/index.js";
import { createAdapter } from "./adapter.js";
export const OidcAdapter = /* @__PURE__ */ createAdapter((config) => {
    return async function () {
        const [step] = usePath().slice(-1);
        const callback = "https://" +
            [useDomainName(), ...usePath().slice(0, -1), "callback"].join("/");
        const client = new config.issuer.Client({
            client_id: config.clientID,
            redirect_uris: [callback],
            response_types: ["id_token"],
        });
        if (step === "authorize") {
            const nonce = generators.nonce();
            const state = generators.state();
            const url = client.authorizationUrl({
                scope: config.scope,
                response_mode: "form_post",
                nonce,
                state,
            });
            const expires = new Date(Date.now() + 1000 * 30).toUTCString();
            return {
                statusCode: 302,
                cookies: [
                    `auth-nonce=${nonce}; HttpOnly; expires=${expires}`,
                    `auth-state=${state}; HttpOnly; expires=${expires}`,
                ],
                headers: {
                    location: url,
                },
            };
        }
        if (step === "callback") {
            const form = useFormData();
            if (!form)
                throw new Error("Missing body");
            const params = Object.fromEntries(form.entries());
            const nonce = useCookie("auth-nonce");
            const state = useCookie("auth-state");
            const tokenset = await client.callback(callback, params, {
                nonce,
                state,
            });
            return config.onSuccess(tokenset, client);
        }
        throw new Error("Invalid auth request");
    };
});
