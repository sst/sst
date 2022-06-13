import {
  StackContext,
  use,
  Api as ApiGateway,
} from "@serverless-stack/resources";
import { Database } from "./Database";

export function Api({ stack }: StackContext) {
  const rds = use(Database);
  const api = new ApiGateway(stack, "api", {
    defaults: {
      function: {
        permissions: [rds],
        environment: {
          RDS_SECRET_ARN: rds.secretArn,
          RDS_ARN: rds.clusterArn,
          RDS_DATABASE: rds.defaultDatabaseName,
        },
      },
    },
    routes: {
      "POST /graphql": {
        type: "pothos",
        function: {
          handler: "functions/graphql/graphql.handler",
        },
        schema: "api/functions/graphql/schema.ts",
        output: "graphql/schema.graphql",
        commands: [
          "npx genql --output ./graphql/genql --schema ./graphql/schema.graphql --esm",
        ],
      },
    },
  });

  stack.addOutputs({
    API_URL: api.url,
  });

  return api;
}
