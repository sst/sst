import { Resource } from "sst";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

export async function connect(event) {
  console.log("!!! connect");
  return { statusCode: 200 };
}

export async function disconnect(event) {
  console.log("!!! disconnect");
  return { statusCode: 200 };
}

export async function sendMessage(event) {
  console.log("!!! sendMessage");
  return { statusCode: 200 };
}

export async function catchAll(event) {
  console.log("!!! default");

  // Send a message back to the client
  const client = new ApiGatewayManagementApiClient({
    endpoint: Resource.MyApi.managementEndpoint,
  });
  await client.send(
    new PostToConnectionCommand({
      ConnectionId: event.requestContext.connectionId,
      Data: "Hey! What is this?",
    })
  );

  return { statusCode: 200 };
}
