import { ResponseStream } from ".";
import { splitCookiesString } from "set-cookie-parser";
import { APIGatewayProxyEventV2, Callback } from "aws-lambda";
import { App } from "astro/app";
import zlib from "zlib";
import { isBinaryContentType } from "../lib/binary";

export async function getRequest(event: APIGatewayProxyEventV2) {
  const {
    body,
    headers,
    rawPath,
    rawQueryString,
    requestContext,
    isBase64Encoded,
  } = event;

  // Convert Lambda request to Node request
  const scheme = headers["x-forwarded-protocol"] || "https";
  const host = headers["x-forwarded-host"] || headers.host;
  const qs = rawQueryString.length > 0 ? `?${rawQueryString}` : "";
  const url = new URL(`${rawPath}${qs}`, `${scheme}://${host}`);
  const encoding = isBase64Encoded ? "base64" : "utf8";
  const request = new Request(url.toString(), {
    method: requestContext.http.method,
    headers: new Headers(headers as any),
    body: typeof body === "string" ? Buffer.from(body, encoding) : body,
  });

  return request;
}

export async function setResponse(
  app: App,
  responseStream: ResponseStream,
  response: Response,
  callback?: Callback
) {
  let cookies: string[] = [];
  const contentType = response.headers.get("content-type");
  const isBinaryContent = contentType && isBinaryContentType(contentType);

  if (response.headers.has("set-cookie")) {
    const header = response.headers.get("set-cookie")!;
    cookies = splitCookiesString(header);
  }

  if (app.setCookieHeaders) {
    for (const setCookieHeader of app.setCookieHeaders(response)) {
      cookies.push(setCookieHeader);
    }
  }

  const headers = Object.fromEntries(response.headers.entries());
  if (!isBinaryContent) headers["Content-Encoding"] = "gzip";

  if (cookies.length > 0) {
    headers["set-cookie"] = cookies.join(";");
  }

  const metadata = {
    statusCode: response.status,
    headers,
  };

  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  if (!response.body) {
    responseStream.end();
    return;
  }

  if (response.body.locked) {
    responseStream.write(
      "Fatal error: Response body is locked. " +
        `This can happen when the response was already read (for example through 'response.json()' or 'response.text()').`
    );
    responseStream.end();
    return;
  }

  const reader = response.body.getReader();

  if (responseStream.destroyed) {
    reader.cancel();
    return;
  }

  let wrapperStream: ResponseStream | zlib.Gzip;

  const cleanup = (error: Error) => {
    responseStream.off("close", cleanup);
    responseStream.off("error", cleanup);
    reader.cancel(error).catch(() => {});

    // In the case of an error, ensure to end the wrapper stream.
    wrapperStream.end();
    if (error) responseStream.destroy(error);
    if (callback) callback(null, "complete");
  };

  if (!isBinaryContent) {
    let gzip = zlib.createGzip();
    gzip.on("error", cleanup);
    gzip.pipe(responseStream);
    wrapperStream = gzip;
  } else {
    wrapperStream = responseStream;
  }

  responseStream.on("close", cleanup);
  responseStream.on("error", cleanup);

  next();

  async function next() {
    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        // Write to the wrapper stream.
        if (!wrapperStream.write(value)) {
          wrapperStream.once("drain", next);
          return;
        }
      }

      // End the wrapper stream when you're done.
      wrapperStream.end();
      if (callback) callback(null, "complete");
    } catch (error) {
      cleanup(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
