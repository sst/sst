import { GraphQLApi, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create the GraphQL API
  const api = new GraphQLApi(stack, "ApolloApi", {
    server: {
      handler: "functions/lambda.handler",
      bundle: {
        format: "cjs",
      },
    },
  });

  // Show the API endpoint in output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
