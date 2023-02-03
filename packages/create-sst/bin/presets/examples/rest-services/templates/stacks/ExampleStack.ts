import { Api, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /notes": "functions/list.main",
      "GET /notes/{id}": "functions/get.main",
      "PUT /notes/{id}": "functions/update.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
