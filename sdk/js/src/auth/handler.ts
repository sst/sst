import { Adapter, AdapterOptions } from "./adapter/adapter.js";
import * as jose from "jose";
import { SessionBuilder } from "./session.js";
import { Hono } from "hono/tiny";
import { Context } from "hono";
import { Resource } from "../resource.js";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { CookieOptions } from "hono/utils/cookie";

const COOKIES = {
  maxAge: 60 * 15,
  // secure: true,
  // sameSite: "None",
  httpOnly: true,
} satisfies CookieOptions;

interface OnSuccessResponder<T extends { type: any; properties: any }> {
  session(input: T & jose.JWTPayload): Promise<Response>;
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
      "The browser was in an unknown state. This could be because certain cookies expired or the browser was switched in the middle of an authentication flow",
    );
  }
}

export class UnauthorizedClientError extends Error {
  constructor(
    public client: string,
    public redirect_uri: string,
  ) {
    super("Unauthorized client");
  }
}

export class InvalidSessionError extends Error {
  constructor() {
    super("Invalid session");
  }
}

export function AuthHandler<
  Providers extends { [key: string]: Adapter<any> },
  Sessions extends SessionBuilder,
>(
  _sessions: Sessions,
  providers: Providers,
  callbacks: {
    index?(event: Request): Promise<Response>;
    error?(error: UnknownStateError): Promise<Response | undefined>;
    auth: {
      error?(
        error:
          | MissingParameterError
          | UnauthorizedClientError
          | UnknownProviderError,
      ): Promise<Response>;
      start?(event: Request): Promise<void>;
      allowClient(clientID: string, redirect: string): Promise<boolean>;
      success(
        response: OnSuccessResponder<Sessions["$typeValues"]>,
        input: {
          [key in keyof Providers]: Providers[key] extends Adapter<
            infer Success
          >
            ? Success
            : never;
        }[keyof Providers],
      ): Promise<Response>;
    };
    connect?: {
      error?(
        error: InvalidSessionError | UnknownProviderError,
      ): Promise<Response | undefined>;
      start?(session: Sessions["$typeValues"], event: Request): Promise<void>;
      success?(session: Sessions["$typeValues"], input: {}): Promise<Response>;
    };
  },
) {
  const auth = Resource[process.env.AUTH_ID!];
  const privateKey = jose.importPKCS8(auth.privateKey, "RS512");
  // const publicKey = jose.importSPKI(auth.publicKey, "RS512");
  const app = new Hono();

  if (!callbacks.auth.error) {
    callbacks.auth.error = async (err) => {
      return new Response(err.message, {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    };
  }

  app.get("/token", async (c) => {
    const form = await c.req.formData();
    if (form.get("grant_type") !== "authorization_code") {
      c.status(400);
      return c.text("Invalid grant_type");
    }
    const code = form.get("code");
    if (!code) {
      c.status(400);
      return c.text("Missing code");
    }

    const pub = Resource[process.env.AUTH_ID!].publicKey;
    const { payload } = await jose.jwtVerify(
      code as string,
      await jose.importPKCS8(pub, "RS512"),
    );
    if (payload.redirect_uri !== form.get("redirect_uri")) {
      c.status(400);
      return c.text("redirect_uri mismatch");
    }
    if (payload.client_id !== form.get("client_id")) {
      c.status(400);
      return c.text("client_id mismatch");
    }

    return c.json({
      access_token: payload.token,
    });
  });

  app.use("/:provider/authorize", async (c, next) => {
    const provider = c.req.param("provider");
    const response_type =
      c.req.query("response_type") || getCookie(c, "response_type");
    const redirect_uri =
      c.req.query("redirect_uri") || getCookie(c, "redirect_uri");
    const state = c.req.query("state") || getCookie(c, "state");

    if (!provider) {
      c.status(400);
      return c.text("Missing provider");
    }

    if (!redirect_uri) {
      c.status(400);
      return c.text("Missing redirect_uri");
    }

    if (!response_type) {
      c.status(400);
      return c.text("Missing response_type");
    }
    const cookies = {
      ...COOKIES,
      ...(c.req.url.startsWith("https://")
        ? { secure: true, sameSite: "None" }
        : {}),
    } as CookieOptions;
    setCookie(c, "provider", provider, cookies);
    setCookie(c, "response_type", response_type, cookies);
    setCookie(c, "redirect_uri", redirect_uri, cookies);
    setCookie(c, "state", state || "", cookies);

    if (callbacks.auth.start) {
      await callbacks.auth.start(c.req.raw);
    }
    await next();
  });

  const options: Omit<AdapterOptions<any>, "name"> = {
    async success(ctx: Context, properties: any) {
      const redirect_uri = getCookie(ctx, "redirect_uri");
      const response_type = getCookie(ctx, "response_type");
      if (!redirect_uri) {
        return options.forward(
          ctx,
          await callbacks.auth.error!(new UnknownStateError()),
        );
      }
      return await callbacks.auth.success(
        {
          async session(session) {
            const token = await new jose.SignJWT(session)
              .setProtectedHeader({ alg: "RS512" })
              .setExpirationTime("1yr")
              .sign(await privateKey);

            deleteCookie(ctx, "provider");
            deleteCookie(ctx, "response_type");
            deleteCookie(ctx, "redirect_uri");
            deleteCookie(ctx, "state");

            const client_id = getCookie(ctx, "client_id");
            const state = getCookie(ctx, "state");

            if (response_type === "token") {
              const location = new URL(redirect_uri);
              location.hash = `access_token=${token}&state=${state || ""}`;
              return ctx.redirect(location.toString(), 302);
            }

            if (response_type === "code") {
              // This allows the code to be reused within a 30 second window
              // The code should be single use but we're making this tradeoff to remain stateless
              // In the future can store this in a dynamo table to ensure single use
              const code = await new jose.SignJWT({
                client_id,
                redirect_uri,
                token,
              })
                .setProtectedHeader({ alg: "RS512" })
                .setExpirationTime("30s")
                .sign(await privateKey);
              const location = new URL(redirect_uri);
              location.searchParams.set("code", code);
              location.searchParams.set("state", state || "");
              return ctx.redirect(location.toString(), 302);
            }

            ctx.status(400);
            return ctx.text(`Unsupported response_type: ${response_type}`);
          },
        },
        properties,
      );
    },
    forward(ctx: Context, response: Response) {
      return ctx.newResponse(
        response.body,
        response.status as any,
        Object.fromEntries(response.headers.entries()),
      );
    },
  };

  for (const [name, value] of Object.entries(providers)) {
    const route = new Hono();
    value(route, {
      name,
      ...options,
    });
    app.route(`/${name}`, route);
  }

  console.log(app.routes);

  return app;
}
