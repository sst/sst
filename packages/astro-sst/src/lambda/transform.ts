import { ResponseStream } from ".";
import { splitCookiesString } from "set-cookie-parser";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import zlib from "zlib";
import { isBinaryContentType } from "../lib/binary";
import { NodeApp } from "astro/app/node";

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
  app: NodeApp,
  responseStream: ResponseStream,
  response: Response
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

  let stream: ResponseStream | zlib.Gzip;
  if (!isBinaryContent) {
    let gzip = zlib.createGzip();
    gzip.pipe(responseStream);
    stream = gzip;
  } else {
    stream = responseStream;
  }

  const cleanup = (error: Error) => {
    stream.off("close", cleanup);
    stream.off("error", cleanup);
    reader.cancel(error).catch(() => {});

    // In the case of an error, ensure to end the wrapper stream.
    stream.end();
    if (error) stream.destroy(error);
  };

  stream.on("close", cleanup);
  stream.on("error", cleanup);

  next();

  async function next() {
    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        // Write to the wrapper stream.
        if (!stream.write(value)) {
          stream.once("drain", next);
          return;
        }
      }

      // End the wrapper stream when you're done.
      stream.end();
    } catch (error) {
      cleanup(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
