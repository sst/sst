import type { SSRManifest } from "astro";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { ResponseStream } from "../lib/types";
import { NodeApp } from "astro/app/node";
import { polyfill } from "@astrojs/webapi";
import { convertFrom, convertTo } from "../lib/event-mapper.js";
import { debug } from "../lib/logger.js";

polyfill(globalThis, {
  exclude: "window document",
});

export function createExports(manifest: SSRManifest) {
  const app = new NodeApp(manifest);

  async function handler(
    event: APIGatewayProxyEventV2,
    responseStream: ResponseStream
  ) {
    debug("event", event);

    // Parse Lambda event
    const internalEvent = convertFrom(event);

    // Build request
    const requestUrl = internalEvent.url;
    const requestProps = {
      method: internalEvent.method,
      headers: internalEvent.headers,
      body: ["GET", "HEAD"].includes(internalEvent.method)
        ? undefined
        : internalEvent.body,
    };
    debug("request", requestUrl, requestProps);
    const request = new Request(requestUrl, requestProps);

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
        ? (() => {
            const cookies: string[] = [];
            for (const header of app.setCookieHeaders(response)) {
              cookies.push(header);
            }
            return cookies;
          })()
        : undefined,
    });
  }

  return {
    // https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
    handler: awslambda.streamifyResponse(handler),
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
