import { APIGatewayProxyResult } from "aws-lambda";

export async function main(): Promise<APIGatewayProxyResult> {
  const body = [];
  for (let i = 0; i < 100000; i++) {
    body.push("1234567890");
  }

  return {
    statusCode: 200,
    body: body.join(""),
  };
}
