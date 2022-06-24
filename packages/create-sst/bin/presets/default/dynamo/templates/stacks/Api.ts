import {
  StackContext,
  use,
  Api as ApiGateway,
} from "@serverless-stack/resources";
import { Database } from "./Database";
import { Dynamo } from "./Dynamo";

export function Api({ stack }: StackContext) {
  const rds = use(Database);
  const table = use(Dynamo);

  const api = new ApiGateway(stack, "api", {
    defaults: {
      function: {
        permissions: [rds, table],
        environment: {
          RDS_SECRET_ARN: rds.secretArn,
          RDS_ARN: rds.clusterArn,
          RDS_DATABASE: rds.defaultDatabaseName,
          DYNAMO_TABLE_NAME: table.tableName,
        },
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
    API_URL: api.url,
  });

  return api;
}
