import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context as LambdaContext, SQSBatchResponse, SQSEvent } from "aws-lambda";
export interface Handlers {
    api: {
        event: APIGatewayProxyEventV2;
        response: APIGatewayProxyStructuredResultV2;
    };
    sqs: {
        event: SQSEvent;
        response: SQSBatchResponse;
    };
}
declare type HandlerTypes = keyof Handlers;
export declare function useEvent<Type extends HandlerTypes>(type: Type): Handlers[Type]["event"];
export declare function useLambdaContext(): LambdaContext;
export declare function Handler<Type extends HandlerTypes, Event = Handlers[Type]["event"], Response = Handlers[Type]["response"]>(type: Type, cb: (evt: Event, ctx: LambdaContext) => Promise<Response>): (event: Event, context: LambdaContext) => Promise<Response>;
export {};
