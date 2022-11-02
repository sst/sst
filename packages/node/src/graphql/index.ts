import { Context } from "aws-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda/trigger/api-gateway-proxy";
import { GraphQLSchema } from "graphql";
import {
  ExecutionContext,
  FormatPayloadParams,
  getGraphQLParameters,
  processRequest,
  ProcessRequestOptions,
  Request,
} from "graphql-helix";
import { Handler, useEvent, useLambdaContext } from "../context/handler.js";
import {
  useHeaders,
  useMethod,
  useJsonBody,
  useQueryParams,
} from "../api/index.js";

interface GraphQLHandlerConfig<C> {
  /**
   * Intercept the response and make changes
   */
  formatPayload?: (params: FormatPayloadParams<C, any>) => any;
  /**
   * This function specifies the ctx object passed to the GraphQL resolver. This is usually not needed
   */
  context?: (request: {
    event: APIGatewayProxyEventV2;
    context: Context;
    execution: ExecutionContext;
  }) => Promise<C>;
  /**
   * The GraphQL schema to be executed
   */
  schema: GraphQLSchema;
  /**
   * Override the GraphQL execute function, sometimes used by plugins
   */
  execute?: ProcessRequestOptions<any, any>["execute"];
}

export function GraphQLHandler<C>(config: GraphQLHandlerConfig<C>) {
  return Handler("api", async () => {
    const request: Request = {
      body: useJsonBody(),
      query: useQueryParams(),
      method: useMethod(),
      headers: useHeaders(),
    };

    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      execute: config.execute,
      schema: config.schema,
      formatPayload: config.formatPayload as any,
      contextFactory: async (execution) => {
        if (config.context) {
          return config.context({
            event: useEvent("api"),
            context: useLambdaContext(),
            execution,
          });
        }
        return;
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
  });
}
