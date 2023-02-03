import { Api, StackContext } from "sst/constructs";

export function ExampleStack({ stack, app }: StackContext) {
  const stage = app.stage;

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    customDomain: `${stage}.example.com`,
    routes: {
      "GET /": "functions/lambda.main",
    },
  });

  // Show the API endpoint in output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
