import type { SSRManifest } from "astro";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { ResponseMode, ResponseStream } from "../lib/types";
import { NodeApp } from "astro/app/node";
import { polyfill } from "@astrojs/webapi";
import { InternalEvent, convertFrom, convertTo } from "../lib/event-mapper.js";
import { debug } from "../lib/logger.js";

polyfill(globalThis, {
  exclude: "window document",
});

function createRequest(internalEvent: InternalEvent) {
  const requestUrl = internalEvent.url;
  const requestProps = {
    method: internalEvent.method,
    headers: internalEvent.headers,
    body: ["GET", "HEAD"].includes(internalEvent.method)
      ? undefined
      : internalEvent.body,
  };
  debug("request", requestUrl, requestProps);
  return new Request(requestUrl, requestProps);
}

export function createExports(
  manifest: SSRManifest,
  { responseMode }: { responseMode: ResponseMode }
) {
  const useStreaming = responseMode === "stream";
  const app = new NodeApp(manifest, useStreaming);

  async function streamHandler(
    event: APIGatewayProxyEventV2,
    responseStream: ResponseStream
  ) {
    debug("event", event);

    // Parse Lambda event
    const internalEvent = convertFrom(event);

    // Build request
    const request = createRequest(internalEvent);

    // Handle page not found
    const routeData = app.match(request, { matchNotFound: true });
    if (!routeData) {
      return streamError(404, "Not found", responseStream);
    }

    // Process request
    const response = await app.render(request, routeData);
    debug("response", response);

    // Stream response back to Cloudfront
    await convertTo({
      type: internalEvent.type,
      response,
      responseStream,
      cookies: app.setCookieHeaders
        ? Array.from(app.setCookieHeaders(response))
        : undefined,
    });
  }

  async function bufferHandler(event: APIGatewayProxyEventV2) {
    debug("event", event);

    // Parse Lambda event
    const internalEvent = convertFrom(event);

    // Build request
    const request = createRequest(internalEvent);

    // Handle page not found
    const routeData = app.match(request, { matchNotFound: true });
    if (!routeData) {
      console.error("Not found");
      return convertTo({
        type: internalEvent.type,
        response: new Response("Not found", { status: 404 }),
      });
    }

    // Process request
    const response = await app.render(request, routeData);
    debug("response", response);

    // Stream response back to Cloudfront
    return convertTo({
      type: internalEvent.type,
      response,
      cookies: app.setCookieHeaders
        ? Array.from(app.setCookieHeaders(response))
        : undefined,
    });
  }

  return {
    // https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
    handler: useStreaming
      ? awslambda.streamifyResponse(streamHandler)
      : bufferHandler,
  };
}

export function streamError(
  statusCode: number,
  error: string | Error,
  responseStream: ResponseStream
) {
  console.error(error);

  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode,
  });

  responseStream.write(error.toString());
  responseStream.end();
}
