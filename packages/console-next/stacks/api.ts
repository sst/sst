import { StackContext, Api, use } from "sst/constructs";
import { Auth } from "./auth";

export function API({ stack }: StackContext) {
  const auth = use(Auth);

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [auth],
      },
    },
    routes: {
      "GET /": "packages/functions/src/lambda.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });

  return api;
}
