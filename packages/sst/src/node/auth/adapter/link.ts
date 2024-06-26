import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createSigner, createVerifier } from "fast-jwt";
import {
  useDomainName,
  usePath,
  useQueryParam,
  useQueryParams,
} from "../../api/index.js";
import { createAdapter } from "./adapter.js";
import { getPrivateKey, getPublicKey } from "../auth.js";

interface LinkConfig {
  onLink: (
    link: string,
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  onSuccess: (
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  onError: () => Promise<APIGatewayProxyStructuredResultV2>;
  expiresInMs?: number;
}

export const LinkAdapter = /* @__PURE__ */ createAdapter(
  (config: LinkConfig) => {
    const signer = createSigner({
      expiresIn: config.expiresInMs || 1000 * 60 * 10,
      key: getPrivateKey(),
      algorithm: "RS512",
    });

    return async function () {
      const [step] = usePath().slice(-1);
      const callback =
        "https://" +
        [useDomainName(), ...usePath().slice(0, -1), "callback"].join("/");

      if (step === "authorize" || step === "connect") {
        const url = new URL(callback);
        const claims = useQueryParams();
        url.searchParams.append("token", signer(claims));
        return config.onLink(url.toString(), claims);
      }

      if (step === "callback") {
        const token = useQueryParam("token");
        if (!token) throw new Error("Missing token parameter");
        try {
          const verifier = createVerifier({
            algorithms: ["RS512"],
            key: getPublicKey(),
          });
          const jwt = verifier(token);
          return config.onSuccess(jwt);
        } catch {
          return config.onError();
        }
      }

      throw new Error("Invalid auth request");
    };
  }
);
