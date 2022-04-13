import { Api, StackContext, Table } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const table = new Table(stack, "CounterExpo", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Allow the API to access the table
        permissions: [table],
        // Pass in the table name to our API
        environment: {
          tableName: table.tableName,
        },
      },
    },
    routes: {
      "POST /": "src/lambda.main",
    },
  });

  // Show the URLs in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
