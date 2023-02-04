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
      "GET    /notes": "packages/functions/srclist.main",
      "POST   /notes": "packages/functions/srccreate.main",
      "GET    /notes/{id}": "packages/functions/srcget.main",
      "PUT    /notes/{id}": "packages/functions/srcupdate.main",
      "DELETE /notes/{id}": "packages/functions/srcdelete.main",
    },
  });

  // Allow the API to access the table
  api.attachPermissions([table]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
