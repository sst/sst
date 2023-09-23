import {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventMultiValueHeaders,
  APIGatewayProxyEventMultiValueQueryStringParameters,
  APIGatewayProxyEventQueryStringParameters,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  APIGatewayProxyWebsocketEventV2,
  Context as LambdaContext,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { create } from "./context2.js";

export interface Handlers {
  api: {
    event: APIGatewayProxyEventV2;
    response: APIGatewayProxyStructuredResultV2 | void;
  };
  ws: {
    // These fields are being returned when we print it but for some reason not
    // part of the APIGatewayProxyWebsocketEventV2 type
    event: APIGatewayProxyWebsocketEventV2 & {
      headers?: APIGatewayProxyEventHeaders;
      multiValueHeaders?: APIGatewayProxyEventMultiValueHeaders;
      queryStringParameters?: APIGatewayProxyEventQueryStringParameters | null;
      multiValueQueryStringParameters?: APIGatewayProxyEventMultiValueQueryStringParameters | null;
    };
    response: APIGatewayProxyResultV2;
  };
  sqs: {
    event: SQSEvent;
    response: SQSBatchResponse;
  };
}

export type HandlerTypes = keyof Handlers;

type Requests = {
  [key in HandlerTypes]: {
    type: key;
    event: Handlers[key]["event"];
    context: LambdaContext;
  };
}[HandlerTypes];

const RequestContext = create<Requests>("RequestContext");

export function useContextType(): HandlerTypes {
  const ctx = RequestContext.use();
  return ctx.type;
}

export function useEvent<Type extends HandlerTypes>(type: Type) {
  const ctx = RequestContext.use();
  if (ctx.type !== type) throw new Error(`Expected ${type} event`);
  return ctx.event as Handlers[Type]["event"];
}

export function useLambdaContext() {
  const ctx = RequestContext.use();
  return ctx.context;
}

export function Handler<
  Type extends HandlerTypes,
  Event = Handlers[Type]["event"],
  Response = Handlers[Type]["response"]
>(type: Type, cb: (evt: Event, ctx: LambdaContext) => Promise<Response>) {
  return function handler(event: Event, context: LambdaContext) {
    return RequestContext.with({ type, event: event as any, context }, () =>
      cb(event, context)
    );
  };
}
