import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import {
  useDomainName,
  usePathParam,
  useQueryParam,
  useQueryParams,
} from "sst/node/api";
import { Adapter, AuthHandler } from "sst/node/future/auth";
import { createSigner, createVerifier } from "fast-jwt";
import { Config } from "sst/node/config";

console.log("fetching", process.env, process.env.AUTH_ID, "PrivateKey");

export const handler = AuthHandler({
  providers: {
    link: LinkAdapter({
      onLink: async (link) => {
        console.log(link);
        return {
          statusCode: 301,
          headers: {
            Location: link,
          },
        };
      },
    }),
  },
  async clients() {
    return {
      solid: "",
    };
  },
  onSuccess: async () => {
    return {
      type: "public",
      properties: {},
    };
  },
  onError: async () => ({
    statusCode: 401,
  }),
});

export function LinkAdapter(config: {
  onLink: (
    link: string,
    claims: Record<string, any>
  ) => Promise<APIGatewayProxyStructuredResultV2>;
}) {
  return async function () {
    // @ts-expect-error
    const key = Config[process.env.AUTH_ID + "PrivateKey"];
    // @ts-expect-error
    const publicKey = Config[process.env.AUTH_ID + "PublicKey"];
    const signer = createSigner({
      expiresIn: 1000 * 60 * 10,
      key,
      algorithm: "RS512",
    });

    const callback = "https://" + useDomainName() + "/callback";
    const step = usePathParam("step");

    if (step === "authorize") {
      const url = new URL(callback);
      const claims = useQueryParams();
      url.searchParams.append("token", signer(claims));
      return {
        type: "step",
        properties: await config.onLink(url.toString(), claims as any),
      };
    }

    if (step === "callback") {
      const token = useQueryParam("token");
      if (!token) throw new Error("Missing token parameter");
      try {
        const verifier = createVerifier({
          algorithms: ["RS512"],
          key: publicKey,
        });
        const jwt = verifier(token);
        return {
          type: "success",
          properties: jwt,
        };
      } catch (ex) {
        return {
          type: "error",
        };
      }
    }

    throw new Error("Invalid auth request");
  } satisfies Adapter;
}
