import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { createSigner, SignerOptions } from "fast-jwt";
import { Config } from "../../node/config/index.js";
import {
  ApiHandler,
  useCookie,
  useCookies,
  usePath,
  usePathParam,
  useQueryParam,
  useQueryParams,
  useResponse,
} from "../api/index.js";
import { Session, SessionValue } from "../auth/session.js";

export function AuthHandler<
  Providers extends Record<string, Adapter<any>>,
  Result = {
    [key in keyof Providers]: {
      provider: key;
    } & Extract<
      Awaited<ReturnType<Providers[key]>>,
      { type: "success" }
    >["properties"];
  }[keyof Providers]
>(input: {
  providers: Providers;
  clients: () => Promise<Record<string, string>>;
  onAuthorize?: (
    event: APIGatewayProxyEventV2
  ) => Promise<void | keyof Providers>;
  onSuccess: (input: Result) => Promise<SessionCreateInput>;
}) {
  return ApiHandler(async (evt) => {
    const step = usePathParam("step");
    let provider = useCookie("provider");

    if (step === "authorize") {
      provider = useQueryParam("provider");
      if (input.onAuthorize) {
        const result = await input.onAuthorize(evt);
        if (result) provider = result as string;
      }

      if (!provider) {
        return {
          statusCode: 400,
          body: "Missing provider",
        };
      }

      const { response_type, client_id, redirect_uri, state } =
        useQueryParams();

      if (!provider) {
        return {
          statusCode: 400,
          body: "Missing provider",
        };
      }

      if (!response_type) {
        return {
          statusCode: 400,
          body: "Missing response_type",
        };
      }

      if (!client_id) {
        return {
          statusCode: 400,
          body: "Missing client_id",
        };
      }

      if (!redirect_uri) {
        return {
          statusCode: 400,
          body: "Missing redirect_uri",
        };
      }

      useResponse().cookies(
        {
          provider: provider,
          response_type: response_type,
          client_id: client_id,
          redirect_uri: redirect_uri,
          state: state || "",
        },
        {
          maxAge: 60 * 15,
          secure: true,
          sameSite: "None",
          httpOnly: true,
        }
      );
    }

    if (!provider || !input.providers[provider]) {
      return {
        statusCode: 400,
        body: `Was not able to find provider "${String(provider)}"`,
        headers: {
          "Content-Type": "text/html",
        },
      };
    }
    const adapter = input.providers[provider];
    const result = await adapter(evt);
    if (result.type === "step") {
      return result.properties;
    }
    if (result.type === "success") {
      const { type, properties, ...rest } = await input.onSuccess({
        provider,
        ...result.properties,
      });
      const signer = createSigner({
        ...rest,
        // @ts-expect-error
        key: Config[process.env.AUTH_ID + "PrivateKey"],
        algorithm: "RS512",
      });
      const token = signer({
        type,
        properties,
      });
      const { response_type, redirect_uri, state } = {
        ...useCookies(),
        ...useQueryParams(),
      } as Record<string, string>;

      if (response_type === "token") {
        return {
          statusCode: 302,
          headers: {
            Location: `${redirect_uri}#access_token=${token}&state=${
              state || ""
            }`,
          },
        };
      }

      if (response_type === "code") {
        return {
          statusCode: 302,
          headers: {
            Location: `${redirect_uri}?code=${token}&state=${state || ""}`,
          },
        };
      }

      return {
        statusCode: 400,
        body: `Unsupported response_type: ${response_type}`,
      };
    }

    return result;
  });
}

export type SessionCreateInput = SessionValue & Partial<SignerOptions>;

export type Adapter<T = any> = (evt: APIGatewayProxyEventV2) => Promise<
  | { type: "step"; properties: APIGatewayProxyStructuredResultV2 }
  | {
      type: "success";
      properties: T;
    }
>;

export * from "./adapter/oidc.js";
export * from "./adapter/google.js";
export * from "./adapter/link.js";
export * from "./adapter/github.js";
export * from "./adapter/oauth.js";
