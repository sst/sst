import { generators, Issuer } from "openid-client";
import {
  useCookie,
  useDomainName,
  useFormData,
  usePathParam,
  useResponse,
} from "../../../api/index.js";
import { Adapter } from "./adapter.js";

export interface OidcBasicConfig {
  /**
   * The clientID provided by the third party oauth service
   */
  clientID: string;
}

export interface OidcConfig extends OidcBasicConfig {
  issuer: Issuer;
  scope: string;
}

export const OidcAdapter = /* @__PURE__ */ (config: OidcConfig) => {
  return async function () {
    const step = usePathParam("step");
    const callback = "https://" + useDomainName() + "/callback";

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

      useResponse().cookies(
        {
          auth_nonce: nonce,
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
      const form = useFormData();
      if (!form) throw new Error("Missing body");
      const params = Object.fromEntries(form.entries());
      const nonce = useCookie("auth_nonce");
      const state = useCookie("auth_state");
      const tokenset = await client.callback(callback, params, {
        nonce,
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

    throw new Error("Invalid auth request");
  } satisfies Adapter;
};
