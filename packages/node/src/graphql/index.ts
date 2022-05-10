import {
  ExecutionContext,
  FormatPayloadParams,
  getGraphQLParameters,
  processRequest,
  Request,
  shouldRenderGraphiQL,
} from "graphql-helix";

import {
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";
import { GraphQLSchema } from "graphql";
import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from "@graphql-tools/schema";

type HandlerConfig<C> = {
  formatPayload?: (params: FormatPayloadParams<C, any>) => any;
  context?: (request: {
    event: APIGatewayProxyEventV2;
    context: Context;
    execution: ExecutionContext;
  }) => Promise<C>;
} & (
  | { schema: GraphQLSchema }
  | {
      resolvers: IExecutableSchemaDefinition<C>["resolvers"];
      typeDefs: IExecutableSchemaDefinition<C>["typeDefs"];
    }
);

export function createGQLHandler<T>(config: HandlerConfig<T>) {
  const schema =
    "schema" in config
      ? config.schema
      : makeExecutableSchema({
          typeDefs: config.typeDefs,
          resolvers: config.resolvers,
        });
  const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    const request: Request = {
      body: event.body ? JSON.parse(event.body) : undefined,
      query: event.queryStringParameters,
      method: event.requestContext.http.method,
      headers: event.headers,
    };

    if (shouldRenderGraphiQL(request)) {
      return {
        statusCode: 302,
        headers: {
          Location: `https://studio.apollographql.com/sandbox/explorer?endpoint=https://${event.requestContext.domainName}`,
        },
      };
    }
    const { operationName, query, variables } = getGraphQLParameters(request);

    // Validate and execute the query
    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
      formatPayload: config.formatPayload as any,
      contextFactory: async (execution) => {
        if (config.context) {
          return config.context({
            event: event,
            context,
            execution,
          });
        }
        return undefined;
      },
    });
    if (result.type === "RESPONSE") {
      return {
        statusCode: result.status,
        body: JSON.stringify(result.payload),
        headers: Object.fromEntries(
          result.headers.map((h) => [h.name, h.value])
        ),
      };
    }
    return {
      statusCode: 500,
    };
  };

  return handler;
}
