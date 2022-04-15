import { Api, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  const stage = app.stage;

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    customDomain: `${stage}.example.com`,
    routes: {
      "GET /": "lambda.main",
    },
  });

  // Show the API endpoint in output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
