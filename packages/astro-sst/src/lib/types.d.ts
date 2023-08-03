import { APIGatewayProxyEventV2, Callback, Context } from "aws-lambda";
import { Writable } from "stream";

declare global {
  const awslambda: {
    streamifyResponse(handler: RequestHandler): RequestHandler;
    HttpResponseStream: {
      from(
        underlyingStream: ResponseStream,
        metadata: {
          statusCode: number;
          headers?: Record<string, string>;
        }
      ): ResponseStream;
    };
  };

  interface CompressionStream {
    readonly readable: ReadableStream;
    readonly writable: WritableStream;
  }
  const CompressionStream: {
    prototype: CompressionStream;
    new (format: "gzip" | "deflate"): CompressionStream;
  };
}

export interface ResponseStream extends Writable {
  getBufferedData(): Buffer;
  setContentType(contentType: string): void;
}

export type RequestHandler = (
  event: APIGatewayProxyEventV2,
  streamResponse: ResponseStream,
  context?: Context,
  callback?: Callback
) => void | Promise<void>;
