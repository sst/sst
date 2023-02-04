import { GraphQLApi, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the GraphQL API
  const api = new GraphQLApi(stack, "ApolloApi", {
    server: {
      handler: "packages/functions/srclambda.handler",
      nodejs: {
        format: "cjs",
      },
    },
  });

  // Show the API endpoint in output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
