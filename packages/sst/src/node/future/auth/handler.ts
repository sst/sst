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
import { SessionBuilder } from "./session.js";
import { Config } from "../../config/index.js";

interface OnSuccessResponder<T extends { type: any; properties: any }> {
  session(input: T & Partial<SignerOptions>): {
    type: "session";
    properties: T;
  };
  http(input: APIGatewayProxyStructuredResultV2): {
    type: "http";
    properties: typeof input;
  };
}

export class UnknownProviderError extends Error {
  constructor(public provider?: string) {
    super("Unknown provider: " + provider);
  }
}

export class MissingParameterError extends Error {
  constructor(public parameter: string) {
    super("Missing parameter: " + parameter);
  }
}

export class UnknownStateError extends Error {
  constructor() {
    super(
      "The user's browser was in an unknown state. This could be because certain cookies expired or the user switched browsers in the middle of an authentication flow"
    );
  }
}

export class UnauthorizedClientError extends Error {
  constructor(public client: string, public redirect_uri: string) {
    super("Unauthorized client");
  }
}

export class InvalidSessionError extends Error {
  constructor() {
    super("Invalid session");
  }
}

export function AuthHandler<
  Providers extends Record<string, Adapter<any>>,
  Sessions extends SessionBuilder,
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
  sessions?: Sessions;
  /** @deprecated use callbacks.auth.allowClient callback instead */
  clients?: () => Promise<Record<string, string>>;
  /** @deprecated use callbacks.auth.allowClient callback instead */
  allowClient?: (clientID: string, redirect: string) => Promise<boolean>;
  /** @deprecated use callbacks.auth.start callback instead */
  onAuthorize?: (
    event: APIGatewayProxyEventV2
  ) => Promise<void | keyof Providers>;
  /** @deprecated use callbacks.auth.success callback instead */
  onSuccess?: (
    input: Result,
    response: OnSuccessResponder<Sessions["$typeValues"]>
  ) => Promise<
    ReturnType<
      OnSuccessResponder<Sessions["$typeValues"]>[keyof OnSuccessResponder<any>]
    >
  >;
  /** @deprecated */
  onIndex?: (
    event: APIGatewayProxyEventV2
  ) => Promise<APIGatewayProxyStructuredResultV2>;
  /** @deprecated use on.error callback instead */
  onError?: (
    error:
      | MissingParameterError
      | UnauthorizedClientError
      | UnknownProviderError
  ) => Promise<APIGatewayProxyStructuredResultV2 | undefined>;
  callbacks: {
    index?(
      event: APIGatewayProxyEventV2
    ): Promise<APIGatewayProxyStructuredResultV2>;
    error?(
      error: UnknownStateError
    ): Promise<APIGatewayProxyStructuredResultV2 | undefined>;
    auth: {
      error?(
        error:
          | MissingParameterError
          | UnauthorizedClientError
          | UnknownProviderError
      ): Promise<APIGatewayProxyStructuredResultV2 | undefined>;
      start?(event: APIGatewayProxyEventV2): Promise<void>;
      allowClient(clientID: string, redirect: string): Promise<boolean>;
      success(
        input: Result,
        response: OnSuccessResponder<Sessions["$typeValues"]>
      ): Promise<
        ReturnType<
          OnSuccessResponder<
            Sessions["$typeValues"]
          >[keyof OnSuccessResponder<any>]
        >
      >;
    };
    connect?: {
      error?(
        error: InvalidSessionError | UnknownProviderError
      ): Promise<APIGatewayProxyStructuredResultV2 | undefined>;
      start?(
        session: Sessions["$typeValues"],
        event: APIGatewayProxyEventV2
      ): Promise<void>;
      success?(
        session: Sessions["$typeValues"],
        input: Result
      ): Promise<APIGatewayProxyStructuredResultV2>;
    };
  };
}) {
  // Remap deprecrated stuff
  const { allowClient, clients, onError, onSuccess, onAuthorize, onIndex } =
    input;
  if (onError && !input.callbacks.auth.error)
    input.callbacks.auth.error = onError;
  if (onSuccess && !input.callbacks.auth.success)
    input.callbacks.auth.success = onSuccess;
  if (onIndex && !input.callbacks.index) input.callbacks.index = onIndex;
  if (onAuthorize && !input.callbacks.auth.start)
    input.callbacks.auth.start = async (evt) => {
      await onAuthorize(evt);
    };
  if (allowClient && !input.callbacks.auth.allowClient)
    input.callbacks.auth.allowClient = allowClient;
  if (clients && !input.callbacks.auth.allowClient)
    input.callbacks.auth.allowClient = async (clientID, redirect) => {
      const list = await clients();
      return list[clientID].startsWith(redirect);
    };

  return ApiHandler(async (evt) => {
    const step = usePathParam("step");

    if (!step) {
      return (
        input.callbacks.index?.(evt) || {
          statusCode: 404,
          body: "Not found",
        }
      );
    }

    if (step === "favicon.ico") {
      return {
        statusCode: 404,
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
    let response_type = useCookie("response_type");
    let redirect_uri = useCookie("redirect_uri");

    console.log("step", step);
    if (step === "connect") {
      provider = useFormValue("provider") || undefined;
      if (!provider) {
        return {
          statusCode: 400,
          body: "Missing provider",
        };
      }
      const token = useFormValue("token")!;
      const verified = input.sessions?.verify(token);
      if (!verified) {
        return (
          (await input.callbacks.connect?.error?.(
            new InvalidSessionError()
          )) || {
            statusCode: 401,
            body: "Invalid session",
          }
        );
      }

      await input.callbacks.connect?.start?.(verified, evt);
      response_type = "connect";

      useResponse().cookies(
        {
          provider,
          response_type: "connect",
          sst_auth_token: token,
        },
        {
          maxAge: 60 * 15,
        }
      );
    }

    if (step === "authorize") {
      provider = useQueryParam("provider");
      response_type = useQueryParam("response_type") || response_type;
      redirect_uri = useQueryParam("redirect_uri") || redirect_uri;
      const { client_id, state } = {
        ...useCookies(),
        ...useQueryParams(),
      } as Record<string, string>;

      if (!provider) {
        return (
          (await input.callbacks.auth.error?.(
            new MissingParameterError("provider")
          )) || {
            statusCode: 400,
            body: "Missing provider",
          }
        );
      }

      if (!redirect_uri) {
        return (
          (await input.callbacks.auth.error?.(
            new MissingParameterError("redirect_uri")
          )) || {
            statusCode: 400,
            body: "Missing redirect_uri",
          }
        );
      }

      if (!response_type) {
        return (
          (await input.callbacks.auth.error?.(
            new MissingParameterError("response_type")
          )) || {
            statusCode: 400,
            body: "Missing response_type",
          }
        );
      }

      if (!client_id) {
        return (
          (await input.callbacks.auth.error?.(
            new MissingParameterError("client_id")
          )) || {
            statusCode: 400,
            body: "Missing client_id",
          }
        );
      }

      if (!(await input.callbacks.auth.allowClient(client_id, redirect_uri))) {
        return (
          (await input.callbacks.auth.error?.(
            new UnauthorizedClientError(client_id, redirect_uri)
          )) || {
            statusCode: 400,
            body: "Invalid redirect_uri",
          }
        );
      }

      if (input.callbacks.auth.start) {
        await input.callbacks.auth.start(evt);
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

    if (!response_type) {
      return (
        (await input.callbacks.error?.(new UnknownStateError())) || {
          statusCode: 400,
          body: new UnknownStateError().message,
        }
      );
    }

    if (!provider || !input.providers[provider]) {
      const err = new UnknownProviderError(provider);
      return (
        (response_type === "connect"
          ? input.callbacks.connect?.error
          : input.callbacks.auth.error)?.(err) || {
          statusCode: 400,
          body: err.toString(),
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }

    const adapter = input.providers[provider];
    const result = await adapter(evt);

    if (!result) {
      return {
        statusCode: 404,
        body: "Not found",
      };
    }

    if (result.type === "step") {
      return result.properties;
    }

    if (result.type === "success") {
      if (response_type === "connect") {
        const session = input.sessions?.use();
        if (!session) {
          return (
            (await input.callbacks.connect?.error?.(
              new InvalidSessionError()
            )) || {
              statusCode: 401,
              body: "Invalid session",
            }
          );
        }

        useResponse().cookies(
          {
            provider: "",
            response_type: "",
            sst_auth_token: "",
          },
          {
            expires: new Date(1),
          }
        );

        return input.callbacks.connect?.success!(session, {
          provider,
          ...result.properties,
        });
      }

      if (response_type === "token" || response_type === "code") {
        if (!redirect_uri) {
          return (
            (await input.callbacks.auth.error?.(new UnknownStateError())) || {
              statusCode: 400,
              body: new UnknownStateError().message,
            }
          );
        }
        const onSuccess = await input.callbacks.auth.success(
          {
            provider,
            ...result.properties,
          },
          {
            http(input) {
              return {
                type: "http",
                properties: input,
              };
            },
            session(input) {
              return {
                type: "session",
                properties: input,
              };
            },
          }
        );

        if (onSuccess.type === "session") {
          const { type, properties, ...rest } = onSuccess.properties;
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
          useResponse()
            .cookie({
              key: "sst_auth_token",
              value: token,
              maxAge: 10 * 365 * 24 * 60 * 60,
            })
            .cookies(
              {
                provider: "",
                response_type: "",
                client_id: "",
                redirect_uri: "",
                state: "",
              },
              {
                expires: new Date(1),
              }
            );

          const { client_id, state } = {
            ...useCookies(),
            ...useQueryParams(),
          } as Record<string, string>;

          if (response_type === "token") {
            const location = new URL(redirect_uri);
            location.hash = `access_token=${token}&state=${state || ""}`;
            return {
              statusCode: 302,
              headers: {
                Location: location.href,
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
            const location = new URL(redirect_uri);
            location.searchParams.set("code", code);
            location.searchParams.set("state", state || "");
            return {
              statusCode: 302,
              headers: {
                Location: location.href,
              },
            };
          }

          return {
            statusCode: 400,
            body: `Unsupported response_type: ${response_type}`,
          };
        }

        if (onSuccess.type === "http") {
          return onSuccess.properties;
        }
      }
    }

    if (result.type === "error") {
      if (response_type === "connect") {
        return (
          (await input.callbacks.connect?.error?.(result.error)) || {
            statusCode: 400,
            body: result.error.message,
          }
        );
      }

      if (!redirect_uri) {
        return (
          (await input.callbacks.auth.error?.(new UnknownStateError())) || {
            statusCode: 400,
            body: new UnknownStateError().message,
          }
        );
      }

      const location = new URL(redirect_uri);
      location.searchParams.set("error", result.error.message);
      return {
        statusCode: 302,
        headers: {
          Location: location.toString(),
        },
      };
    }
  });
}
