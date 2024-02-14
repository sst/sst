import { Adapter } from "./adapter.js";
import * as jose from "jose";
import { deleteCookie, getCookie } from "hono/cookie";
import { UnknownStateError } from "../index.js";

export function CodeAdapter(config: {
  length?: number;
  onCodeRequest: (
    code: string,
    claims: Record<string, any>,
  ) => Promise<Response>;
  onCodeInvalid: (
    code: string,
    claims: Record<string, any>,
  ) => Promise<Response>;
}) {
  const length = config.length || 6;
  function generate() {
    const buffer = crypto.getRandomValues(new Uint8Array(length));
    const otp = Array.from(buffer)
      .map((byte) => byte % 10)
      .join("");
    return otp;
  }

  return function (routes, ctx) {
    routes.get("/authorize", async (c) => {
      const code = generate();
      const claims = c.req.query();
      delete claims["client_id"];
      delete claims["redirect_uri"];
      delete claims["response_type"];
      delete claims["provider"];
      const authorization = await new jose.CompactEncrypt(
        new TextEncoder().encode(
          JSON.stringify({
            claims,
            code,
          }),
        ),
      )
        .setProtectedHeader({ alg: "RSA-OAEP-512", enc: "A256GCM" })
        .encrypt(await ctx.encryption.publicKey);
      ctx.cookie(c, "authorization", authorization, 60 * 10);
      return ctx.forward(c, await config.onCodeRequest(code, claims as any));
    });

    routes.get("/callback", async (c) => {
      const authorization = getCookie(c, "authorization");
      if (!authorization) throw new UnknownStateError();
      const { code, claims } = JSON.parse(
        new TextDecoder().decode(
          await jose
            .compactDecrypt(authorization!, await ctx.encryption.privateKey)
            .then((value) => value.plaintext),
        ),
      );
      if (!code || !claims) {
        return ctx.forward(c, await config.onCodeInvalid(code, claims as any));
      }
      const compare = c.req.query("code");
      if (code !== compare) {
        return ctx.forward(c, await config.onCodeInvalid(code, claims as any));
      }
      deleteCookie(c, "authorization");
      return ctx.forward(c, await ctx.success(c, { claims }));
    });
  } satisfies Adapter<{ claims: Record<string, string> }>;
}
