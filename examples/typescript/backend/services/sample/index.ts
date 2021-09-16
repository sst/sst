import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { Sample } from "@acme/core";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const result = Sample.foo();
  return {
    statusCode: 200,
    body: result,
  };
};
