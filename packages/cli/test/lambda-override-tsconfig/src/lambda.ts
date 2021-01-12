import { APIGatewayProxyResult } from "aws-lambda";

export async function handler(): Promise<APIGatewayProxyResult> {
  let y: number; // eslint-disable-line prefer-const
  y = null; // eslint-disable-line prefer-const, @typescript-eslint/no-unused-vars
  return {
    statusCode: 200,
    body: "Hello World!",
    headers: { "Content-Type": "text/plain" },
  };
}
