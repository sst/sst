import { APIGatewayProxyResult } from "aws-lambda";

export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log(event);
  return {
    statusCode: 200,
    body: "hi",
  };
}
