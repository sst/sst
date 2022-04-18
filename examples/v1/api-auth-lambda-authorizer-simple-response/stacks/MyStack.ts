import { Api, StackContext, Function } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Api
  const api = new Api(stack, "Api", {
    authorizers: {
      lambda: {
        type: "lambda",
        function: new Function(stack, "Authorizer", {
          handler: "authorizer.main",
        }),
      },
    },
    defaults: {
      authorizer: "lambda",
    },
    routes: {
      "GET /private": "private.main",
      "GET /public": {
        function: "public.main",
        authorizer: "none",
      },
    },
  });

  // Show the API endpoint and other info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
