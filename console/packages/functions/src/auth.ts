import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import {
  useDomainName,
  usePathParam,
  useQueryParam,
  useQueryParams,
} from "sst/node/api";
import { Adapter, AuthHandler, GithubAdapter } from "sst/node/future/auth";
import { createSigner, createVerifier } from "fast-jwt";
import { Config } from "sst/node/config";
import { Octokit } from "@octokit/rest";

declare module "sst/node/future/auth" {
  export interface SessionTypes {
    email: {
      email: string;
    };
  }
}

export const handler = AuthHandler({
  providers: {
    github: GithubAdapter({
      mode: "oauth",
      scope: "read:user user:email",
      clientID: Config.GITHUB_CLIENT_ID,
      clientSecret: Config.GITHUB_CLIENT_SECRET,
    }),
  },
  async clients() {
    return {
      solid: "",
    };
  },
  onSuccess: async (input) => {
    if (input.provider === "github") {
      const o = new Octokit({
        auth: input.tokenset.access_token,
      });
      const emails = await o.request("GET /user/emails");
      const email = emails.data.find((x) => x.primary)?.email;
      if (!email) throw new Error("No email found");
      return {
        type: "email",
        properties: {
          email,
        },
      };
    }
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
