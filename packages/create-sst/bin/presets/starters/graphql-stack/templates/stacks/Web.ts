import { StackContext, use, ViteStaticSite } from "@serverless-stack/resources";
import { Api } from "./Api";
import { Cognito } from "./Cognito";

export function Web({ stack }: StackContext) {
  const api = use(Api);
  const cognito = use(Cognito);

  const site = new ViteStaticSite(stack, "site", {
    path: "web",
    buildCommand: "npm run build",
    environment: {
      VITE_API_URL: api.url,
      VITE_COGNITO_USER_POOL_ID: cognito.userPoolId,
      VITE_COGNITO_CLIENT_ID: cognito.userPoolClientId,
    },
  });

  stack.addOutputs({
    SITE_URL: site.url,
  });

  return api;
}
