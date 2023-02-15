import { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";

export const main: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event
) => {
  return {
    statusCode: 200,
    body: `Hello ${event.requestContext.authorizer.jwt.claims.sub}!`,
  };
};
