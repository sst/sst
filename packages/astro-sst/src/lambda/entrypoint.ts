import type { SSRManifest } from "astro";
import type { APIGatewayProxyEventV2, Callback, Context } from "aws-lambda";
import { polyfill } from "@astrojs/webapi";
import { getRequest, setResponse } from "./transform";
import { ResponseStream } from ".";
import { App } from "astro/app";

polyfill(globalThis, {
  exclude: "window document",
});

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  const handler = async (
    event: APIGatewayProxyEventV2,
    responseStream: ResponseStream,
    _context?: Context,
    callback?: Callback
  ) => {
    let request: Request;

    try {
      request = await getRequest(event);
    } catch (err: any) {
      streamError(400, err, responseStream);
      return;
    }

    const routeData = app.match(request, { matchNotFound: true });
    if (!routeData) {
      streamError(404, "Not found", responseStream);
      return;
    }

    // Process request
    const response = await app.render(request, routeData);

    // Stream response back to Cloudfront
    await setResponse(app, responseStream, response, callback);
  };

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
  console.log("status code", statusCode);
  console.log("error", error);

  responseStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode,
  });

  responseStream.write(error.toString());
  responseStream.end();
}
