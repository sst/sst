import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { Adapter } from "./adapter/adapter.js";
import { createSigner, createVerifier, SignerOptions } from "fast-jwt";
import {
  ApiHandler,
  useCookie,
  useCookies,
  useFormValue,
  usePathParam,
  useQueryParam,
  useQueryParams,
  useResponse,
} from "../../api/index.js";
import { SessionValue } from "./session.js";
import { Config } from "../../config/index.js";

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
  onError: () => Promise<APIGatewayProxyStructuredResultV2>;
}) {
  return ApiHandler(async (evt) => {
    const step = usePathParam("step");
    if (!step) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html",
        },
        body: `
          <html>
            <body>
            ${Object.keys(input.providers).map((name) => {
              return `<a href="/authorize?provider=${name}&response_type=code&client_id=local&redirect_uri=http://localhost:300">${name}</a>`;
            })}
            </body>
          </html>
        `,
      };
    }

    if (step === "token") {
      if (useFormValue("grant_type") !== "authorization_code") {
        return {
          statusCode: 400,
          body: "Invalid grant_type",
        };
      }
      const code = useFormValue("code");
      if (!code) {
        return {
          statusCode: 400,
          body: "Missing code",
        };
      }
      // @ts-expect-error
      const pub = Config[process.env.AUTH_ID + "PublicKey"] as string;
      const verified = createVerifier({
        algorithms: ["RS512"],
        key: pub,
      })(code);

      if (verified.redirect_uri !== useFormValue("redirect_uri")) {
        return {
          statusCode: 400,
          body: "redirect_uri mismatch",
        };
      }

      if (verified.client_id !== useFormValue("client_id")) {
        return {
          statusCode: 400,
          body: "client_id mismatch",
        };
      }

      return {
        statusCode: 200,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          access_token: verified.token,
        }),
      };
    }

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

      // @ts-expect-error
      const priv = Config[process.env.AUTH_ID + "PrivateKey"] as string;
      const signer = createSigner({
        ...rest,
        key: priv,
        algorithm: "RS512",
      });
      const token = signer({
        type,
        properties,
      });
      const { client_id, response_type, redirect_uri, state } = {
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
        // This allows the code to be reused within a 30 second window
        // The code should be single use but we're making this tradeoff to remain stateless
        // In the future can store this in a dynamo table to ensure single use
        const code = createSigner({
          expiresIn: 1000 * 60 * 5,
          key: priv,
          algorithm: "RS512",
        })({
          client_id,
          redirect_uri,
          token: token,
        });
        return {
          statusCode: 302,
          headers: {
            Location: `${redirect_uri}?code=${code}&state=${state || ""}`,
          },
        };
      }

      return {
        statusCode: 400,
        body: `Unsupported response_type: ${response_type}`,
      };
    }

    if (result.type === "error") {
      return input.onError();
    }
  });
}

export type SessionCreateInput = SessionValue & Partial<SignerOptions>;
