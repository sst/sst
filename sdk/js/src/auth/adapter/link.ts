import { Adapter } from "./adapter.js";
import { Resource } from "../../resource.js";
import * as jose from "jose";

export function LinkAdapter<
  T extends Record<string, string> = Record<string, string>,
>(config: { onLink: (link: string, claims: T) => Promise<Response> }) {
  return function (routes, ctx) {
    const { privateKey, publicKey } = Resource[process.env.AUTH_ID!];

    routes.get("/authorize", async (c) => {
      const token = await new jose.SignJWT(c.req.query())
        .setProtectedHeader({ alg: "RS512" })
        .setExpirationTime("10m")
        .sign(await jose.importPKCS8(privateKey, "RS512"));

      const url = new URL(new URL(c.req.url).origin);
      url.pathname = `/${ctx.name}/callback`;
      for (const key of url.searchParams.keys()) {
        url.searchParams.delete(key);
      }
      url.searchParams.set("token", token);
      const resp = ctx.forward(
        c,
        await config.onLink(url.toString(), c.req.query() as T),
      );
      return resp;
    });

    routes.get("/callback", async (c) => {
      const token = c.req.query("token");
      if (!token) throw new Error("Missing token parameter");
      const verified = await jose.jwtVerify(
        token,
        await jose.importSPKI(publicKey, "RS512"),
      );
      const resp = await ctx.success(c, verified.payload as any);
      return resp;
    });
  } as Adapter<T>;
}
