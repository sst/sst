import { Api, StackContext, Function } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the HTTP API
  const api = new Api(stack, "api", {
    routes: {
      "GET /": new Function(stack, "HelloWorld", {
        runtime: "python3.9",
        handler: "packages/hello/src/lambda.handler",
      }),
    },
  });

  // Add the API Endpoint to the outputs
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
