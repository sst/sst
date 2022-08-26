import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { createSigner } from "fast-jwt";
import {
  useDomainName,
  usePath,
  useQueryParam,
  useQueryParams,
} from "../../context/http.js";
import { KEY, verifier } from "../jwt.js";
import { createAdapter } from "./adapter.js";

interface LinkConfig {
  onLink: (
    link: string,
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  onSuccess: (
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  onError: () => Promise<APIGatewayProxyStructuredResultV2>;
}

export const LinkAdapter = /* @__PURE__ */ createAdapter(
  (config: LinkConfig) => {
    const signer = createSigner({ expiresIn: 1000 * 60 * 10, key: KEY });

    return async function () {
      const [step] = usePath().slice(-1);
      const callback =
        "https://" +
        useDomainName() +
        [...usePath().slice(0, -1), "callback"].join("/");

      if (step === "authorize") {
        const url = new URL(callback);
        const claims = useQueryParams();
        url.searchParams.append("token", signer(claims));
        return config.onLink(url.toString(), claims);
      }

      if (step === "callback") {
        const token = useQueryParam("token");
        if (!token) throw new Error("Missing token parameter");
        try {
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
