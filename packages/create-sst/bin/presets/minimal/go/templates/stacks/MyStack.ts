import { StackContext, Api } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "services/functions/lambda/main.go",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
