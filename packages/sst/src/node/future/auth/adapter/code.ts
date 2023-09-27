import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import {
  useCookie,
  useDomainName,
  usePathParam,
  useQueryParam,
  useQueryParams,
  useResponse,
} from "../../../api/index.js";
import { Adapter } from "./adapter.js";
import { randomBytes } from "crypto";
import { decrypt, encrypt } from "../encryption.js";

export function CodeAdapter(config: {
  length?: number;
  onCodeRequest: (
    code: string,
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  onCodeInvalid: (
    code: string,
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
}) {
  const length = config.length || 6;

  function generate() {
    const buffer = randomBytes(length);
    const otp = Array.from(buffer)
      .map((byte) => byte % 10)
      .join("");
    return otp;
  }

  return async function () {
    const step = usePathParam("step");

    if (step === "authorize" || step === "connect") {
      const code = generate();
      const claims = useQueryParams();
      delete claims["client_id"];
      delete claims["redirect_uri"];
      delete claims["response_type"];
      delete claims["provider"];
      useResponse().cookies(
        {
          authorization: encrypt(
            JSON.stringify({
              claims,
              code,
            })
          ),
        },
        {
          maxAge: 3600,
          secure: true,
          sameSite: "None",
          httpOnly: true,
        }
      );
      return {
        type: "step",
        properties: await config.onCodeRequest(code, claims as any),
      };
    }

    if (step === "callback") {
      const { code, claims } = JSON.parse(
        decrypt(useCookie("authorization")!)!
      );
      if (!code || !claims) {
        return {
          type: "step",
          properties: await config.onCodeInvalid(code, claims),
        };
      }
      const compare = useQueryParam("code");
      if (code !== compare) {
        return {
          type: "step",
          properties: await config.onCodeInvalid(code, claims),
        };
      }
      useResponse().cookies(
        {
          authorization: "",
        },
        {
          expires: new Date(1),
        }
      );
      return {
        type: "success",
        properties: {
          claims: claims,
        },
      };
    }
  } satisfies Adapter;
}
