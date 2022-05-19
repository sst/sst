import { Api, StackContext, Table } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create the table
  const table = new Table(stack, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Pass in the table name to our API
        environment: {
          tableName: table.tableName,
        },
        permissions: [table],
      },
    },
    routes: {
      "POST /": "functions/lambda.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
