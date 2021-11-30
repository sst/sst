import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export async function main(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log(event);

  // Build error
  //new ApiStack(app, "api

  // TypeCheck error
  //a

  // Lint error
  //if (true) { }

  // Lint warning
  //const a = 1;

  // thrown error
  //JSON.parse("abc");
  //throw new Error("abc2");

  return {
    statusCode: 200,
    body: "hi",
  };
}
