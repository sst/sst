import {
  ExecutionContext,
  FormatPayloadParams,
  getGraphQLParameters,
  processRequest,
  Request,
  shouldRenderGraphiQL,
} from "graphql-helix";

import {
  IExecutableSchemaDefinition,
  makeExecutableSchema,
} from "@graphql-tools/schema";

import {
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";

type HandlerConfig<C> = {
  resolvers: IExecutableSchemaDefinition<C>["resolvers"];
  typeDefs: IExecutableSchemaDefinition<C>["typeDefs"];
  formatPayload?: (params: FormatPayloadParams<any, any>) => ExecutionResult;
  context?: (request: {
    event: APIGatewayProxyEventV2;
    context: Context;
    execution: ExecutionContext;
  }) => Promise<C>;
};

export function createGQLHandler<T>(config: HandlerConfig<T>) {
  const schema = makeExecutableSchema({
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
      formatPayload: config.formatPayload,
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

type UploadResolverConfig<C extends any> = {
  user: (context: C) => Promise<string>;
  bucket: string;
};

import S3 from "aws-sdk/clients/s3.js";
import path from "path";
import { ExecutionResult } from "graphql";

const s3 = new S3();

export function UploadResolver<C>(config: UploadResolverConfig<C>) {
  return {
    Mutation: {
      upload: async (
        _parent: any,
        vars: { name: string; type: string },
        ctx: C
      ) => {
        const user = await config.user(ctx);
        const key = path.join(user, vars.name);
        const url = s3.getSignedUrl("putObject", {
          Bucket: config.bucket,
          Key: key,
          ContentType: vars.type,
          ACL: "public-read",
        });
        return url;
      },
    },
  };
}
