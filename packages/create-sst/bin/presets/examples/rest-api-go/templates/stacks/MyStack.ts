import { Api, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create the HTTP API
  const api = new Api(stack, "Api", {
    routes: {
      "GET /notes": "list.go",
      "GET /notes/{id}": "get.go",
      "PUT /notes/{id}": "update.go",
    },
  });

  // Show API endpoint in output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
