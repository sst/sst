import { StackContext, use, ViteStaticSite } from "@serverless-stack/resources";
import { Api } from "./Api";

export function Web({ stack }: StackContext) {
  const api = use(Api);

  const site = new ViteStaticSite(stack, "site", {
    path: "web",
    buildCommand: "npm run build",
    environment: {
      VITE_GRAPHQL_URL: api.url + "/graphql",
    },
  });

  stack.addOutputs({
    SITE_URL: site.url,
  });

  return api;
}
