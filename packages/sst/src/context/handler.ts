import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context as LambdaContext,
  SQSBatchResponse,
  SQSEvent,
} from "aws-lambda";
import { Context } from "./context.js";

export interface Handlers {
  api: {
    event: APIGatewayProxyEventV2;
    response: APIGatewayProxyStructuredResultV2 | void;
  };
  sqs: {
    event: SQSEvent;
    response: SQSBatchResponse;
  };
}

type HandlerTypes = keyof Handlers;

type Requests = {
  [key in HandlerTypes]: {
    type: key;
    event: Handlers[key]["event"];
    context: LambdaContext;
  };
}[HandlerTypes];

const RequestContext = Context.create<Requests>("RequestContext");

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
    RequestContext.provide({ type, event: event as any, context });
    return cb(event, context);
  };
}
