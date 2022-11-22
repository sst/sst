import { use, StackContext, Api as ApiGateway } from "sst/constructs";
import { Database } from "./Database.js";

export function Api({ stack }: StackContext) {
  const table = use(Database);

  const api = new ApiGateway(stack, "api", {
    defaults: {
      function: {
        bind: [table],
      },
    },
    routes: {
      "POST /graphql": {
        type: "graphql",
        function: {
          handler: "services/functions/graphql/graphql.handler",
        },
        pothos: {
          schema: "services/functions/graphql/schema.ts",
          output: "graphql/schema.graphql",
          commands: [
            "npx genql --output ./graphql/genql --schema ./graphql/schema.graphql --esm",
          ],
        },
      },
    },
  });

  stack.addOutputs({
    API: api.url,
  });

  return api;
}
