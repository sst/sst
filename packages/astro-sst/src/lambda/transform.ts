import { NodeApp } from "astro/app/node";
import { ResponseStream } from ".";
import { splitCookiesString } from "set-cookie-parser";
import { APIGatewayProxyEventV2 } from "aws-lambda";

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

  const cancel = (error?: Error) => {
    responseStream.off("close", cancel);
    responseStream.off("error", cancel);

    // If the reader has already been interrupted with an error earlier,
    // then it will appear here, it is useless, but it needs to be catch.
    reader.cancel(error).catch(() => {});
    if (error) responseStream.destroy(error);
  };

  responseStream.on("close", cancel);
  responseStream.on("error", cancel);

  next();
  async function next() {
    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        if (!responseStream.write(value)) {
          responseStream.once("drain", next);
          return;
        }
      }
      responseStream.end();
    } catch (error) {
      cancel(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
