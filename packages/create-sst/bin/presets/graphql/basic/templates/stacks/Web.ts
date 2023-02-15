import { use, StackContext, StaticSite } from "sst/constructs";
import { Api } from "./Api.js";

export function Web({ stack }: StackContext) {
  const api = use(Api);

  const site = new StaticSite(stack, "site", {
    path: "packages/web",
    buildCommand: "npm run build",
    buildOutput: "dist",
    environment: {
      VITE_GRAPHQL_URL: api.url + "/graphql",
    },
  });

  stack.addOutputs({
    SITE: site.url || "https://localhost:3000",
  });
}
