import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "Api::Api.Handlers::Handler",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
