import { Api, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        srcPath: "services/Api",
      },
    },
    routes: {
      "GET /notes": "Api::Api.Handlers::List",
      "GET /notes/{id}": "Api::Api.Handlers::Get",
      "PUT /notes/{id}": "Api::Api.Handlers::Update",
    },
  });

  // Show API endpoint in output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
