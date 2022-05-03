import { StackContext, Table, WebSocketApi } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create the table
  const table = new Table(stack, "Connections", {
    fields: {
      id: "string",
    },
    primaryIndex: { partitionKey: "id" },
  });

  // Create the WebSocket API
  const api = new WebSocketApi(stack, "Api", {
    defaults: {
      function: {
        environment: {
          tableName: table.tableName,
        },
      },
    },
    routes: {
      $connect: "connect.main",
      $disconnect: "disconnect.main",
      sendmessage: "sendMessage.main",
    },
  });

  // Allow the API to access the table
  api.attachPermissions([table]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
