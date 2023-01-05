import { Context } from "aws-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda/trigger/api-gateway-proxy";
import { GraphQLSchema } from "graphql";
import { ExecutionContext, FormatPayloadParams, ProcessRequestOptions } from "graphql-helix";
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
export declare function GraphQLHandler<C>(config: GraphQLHandlerConfig<C>): (event: APIGatewayProxyEventV2, context: Context) => Promise<{
    statusCode: number;
    body: string;
    headers: {
        [k: string]: string;
    };
} | {
    statusCode: number;
    body?: undefined;
    headers?: undefined;
}>;
export {};
