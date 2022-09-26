import { Api } from "@serverless-stack/resources";

export function MyStack({ stack }) {
  const api = new Api(stack, "api", {
    routes: {
      "GET /": "minimal.java.native.FunctionRequestHandler",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url
  });
}
