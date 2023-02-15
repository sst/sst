import { Api, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /notes": "packages/functions/src/list.main",
      "GET /notes/{id}": "packages/functions/src/get.main",
      "PUT /notes/{id}": "packages/functions/src/update.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
