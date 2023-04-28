import { Api, StackContext, StaticSite, use } from "sst/constructs";
import { API } from "./api";
import { Auth } from "./auth";

export function Web(ctx: StackContext) {
  const workspace = new StaticSite(ctx.stack, "workspace", {
    path: "./packages/web/workspace",
    environment: {
      VITE_API_URL: use(API).url,
      VITE_AUTH_URL: use(Auth).url,
    },
  });
}
