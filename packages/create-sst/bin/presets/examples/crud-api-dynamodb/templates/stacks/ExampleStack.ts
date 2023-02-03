import { Api, StackContext, Table } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create the table
  const table = new Table(stack, "Notes", {
    fields: {
      userId: "string",
      noteId: "string",
    },
    primaryIndex: { partitionKey: "userId", sortKey: "noteId" },
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Bind the table name to our API
        bind: [table],
      },
    },
    routes: {
      "GET    /notes": "functions/list.main",
      "POST   /notes": "functions/create.main",
      "GET    /notes/{id}": "functions/get.main",
      "PUT    /notes/{id}": "functions/update.main",
      "DELETE /notes/{id}": "functions/delete.main",
    },
  });

  // Allow the API to access the table
  api.attachPermissions([table]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
