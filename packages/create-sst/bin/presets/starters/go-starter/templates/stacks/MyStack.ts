import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda/main.go",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
