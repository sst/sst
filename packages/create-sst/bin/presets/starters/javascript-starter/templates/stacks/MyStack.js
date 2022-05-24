import { Api } from "@serverless-stack/resources";

export function MyStack({ stack }) {
  new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });
}
