import { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event) => {
  return {
    statusCode: 200,
    body: `Hello world from account: ${event.requestContext.accountId}`,
    headers: { "Content-Type": "text/plain" },
  };
}
