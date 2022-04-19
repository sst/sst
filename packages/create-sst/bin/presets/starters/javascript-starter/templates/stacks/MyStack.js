import { StackContext, Api } from "@serverless-stack/resources";

/**
 * @param {StackContext} ctx
 */
export function MyStack({ stack }) {
  new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });
}
