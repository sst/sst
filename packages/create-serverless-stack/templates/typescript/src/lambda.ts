import { APIGatewayEvent } from "aws-lambda";

export async function handler(event: APIGatewayEvent): any {
  return {
    statusCode: 200,
    body: "Hello World!",
    headers: { "Content-Type": "text/plain" },
  };
}
