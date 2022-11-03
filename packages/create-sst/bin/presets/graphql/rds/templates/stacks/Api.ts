import {
  use,
  Config,
  StackContext,
  Api as ApiGateway,
} from "@serverless-stack/resources";
import { Database } from "./Database";

export function Api({ stack }: StackContext) {
  const rds = use(Database);

  const api = new ApiGateway(stack, "api", {
    defaults: {
      function: {
        bind: [rds],
      },
    },
    routes: {
      "POST /graphql": {
        type: "pothos",
        function: {
          handler: "functions/graphql/graphql.handler",
        },
        schema: "services/functions/graphql/schema.ts",
        output: "graphql/schema.graphql",
        commands: [
          "npx genql --output ./graphql/genql --schema ./graphql/schema.graphql --esm",
        ],
      },
    },
  });

  stack.addOutputs({
    API: api.url,
  });

  return api;
}
