import { StackContext, Api } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "api.Handler::handleRequest",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
