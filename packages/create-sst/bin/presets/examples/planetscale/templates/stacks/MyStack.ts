import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          PLANETSCALE_TOKEN: process.env.PLANETSCALE_TOKEN,
          PLANETSCALE_TOKEN_NAME: process.env.PLANETSCALE_TOKEN_NAME,
          PLANETSCALE_ORG: process.env.PLANETSCALE_ORG,
          PLANETSCALE_DB: process.env.PLANETSCALE_DB,
        },
      },
    },
    routes: {
      "POST /": "src/lambda.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
