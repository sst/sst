import { Api, StackContext, StaticSite, use } from "sst/constructs";
import { API } from "./api";
import { Auth } from "./auth";

export function Web(ctx: StackContext) {
  const solid = new StaticSite(ctx.stack, "site", {
    path: "./packages/solid",
    environment: {
      VITE_API_URL: use(API).url,
      VITE_AUTH_URL: use(Auth).url,
    },
  });
}
