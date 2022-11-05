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
        bind: [table],
      },
    },
    routes: {
      $connect: "functions/connect.main",
      $disconnect: "functions/disconnect.main",
      sendmessage: "functions/sendMessage.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
