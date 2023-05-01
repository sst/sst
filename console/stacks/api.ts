import { StackContext, Api, use } from "sst/constructs";
import { Auth } from "./auth";
import { Secrets } from "./secrets";

export function API({ stack }: StackContext) {
  const auth = use(Auth);
  const secrets = use(Secrets);

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [auth, ...Object.values(secrets.database)],
      },
    },
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
      "POST /replicache/pull": "packages/functions/src/replicache/pull.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return api;
}
