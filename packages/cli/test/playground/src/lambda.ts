import { APIGatewayProxyResult } from "aws-lambda";

export async function main(event): Promise<APIGatewayProxyResult> {
  console.log(event);
  console.log(event.params);
  return {
    statusCode: 200,
    body: "hi",
  };
}
