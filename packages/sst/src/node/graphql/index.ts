import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { createYoga, YogaServerOptions } from "graphql-yoga";
import { Handler, useEvent, useLambdaContext } from "../../context/handler.js";

type ServerContext = {
  event: APIGatewayProxyEventV2;
  context: Context;
};

export function GraphQLHandler<UserContext extends {}>(
  options: YogaServerOptions<ServerContext, UserContext>
) {
  const yoga = createYoga<ServerContext, UserContext>({
    graphqlEndpoint: process.env.GRAPHQL_ENDPOINT,
    ...options,
  });

  return Handler("api", async () => {
    const event = useEvent("api");

    const parameters = new URLSearchParams(
      (event.queryStringParameters as Record<string, string>) || {}
    ).toString();

    const url = `${event.rawPath}?${parameters}`;

    const request: RequestInit = {
      method: event.requestContext.http.method,
      headers: event.headers as HeadersInit,
      body: event.body
        ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
        : undefined,
    };

    const serverContext: ServerContext = {
      event,
      context: useLambdaContext(),
    };

    const response = await yoga.fetch(url, request, serverContext);
    const responseHeaders = Object.fromEntries(response.headers.entries());

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: await response.text(),
      isBase64Encoded: false,
    };
  });
}
