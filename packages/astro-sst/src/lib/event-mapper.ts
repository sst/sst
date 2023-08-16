import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  CloudFrontRequestEvent,
  CloudFrontRequestResult,
  CloudFrontHeaders,
} from "aws-lambda";
import type { ResponseStream } from "./types";
import { splitCookiesString } from "set-cookie-parser";
import { debug } from "./logger.js";
import { isBinaryContentType } from "./binary.js";

type InternalEvent = {
  readonly type: "v1" | "v2" | "cf";
  readonly method: string;
  readonly queryString: string;
  readonly rawPath: string;
  readonly url: string;
  readonly body: Buffer;
  readonly headers: Record<string, string>;
  readonly remoteAddress: string;
};

type InternalResultInput = {
  readonly type: "v1" | "v2" | "cf";
  response: Response;
  responseStream?: ResponseStream;
  cookies?: string[];
};

type InternalResult = {
  readonly type: "v1" | "v2" | "cf";
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
  isBase64Encoded: boolean;
};

type InternalStreamingResult = {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: ReadableStream | null;
  responseStream: ResponseStream;
};

function isApigV2Event(event: any): event is APIGatewayProxyEventV2 {
  return event.version === "2.0";
}

function isApigV1Event(event: any): event is APIGatewayProxyEvent {
  return event.version === undefined && !isCfEvent(event);
}

function isCfEvent(event: any): event is CloudFrontRequestEvent {
  return event.Records !== undefined;
}

export function convertFrom(
  event: APIGatewayProxyEventV2 | APIGatewayProxyEvent | CloudFrontRequestEvent
) {
  let iEvent: Omit<InternalEvent, "url">;
  if (isCfEvent(event)) {
    iEvent = convertFromCfEvent(event);
  } else if (isApigV2Event(event)) {
    iEvent = convertFromApigV2Event(event);
  } else if (isApigV1Event(event)) {
    iEvent = convertFromApigV1Event(event);
  } else {
    throw new Error("Unsupported event type");
  }

  // Fix host header
  if (iEvent.headers["x-forwarded-host"]) {
    iEvent.headers.host = iEvent.headers["x-forwarded-host"];
  }

  // Build URL
  const scheme = iEvent.headers["x-forwarded-protocol"] || "https";
  const url = new URL(
    iEvent.queryString
      ? `${iEvent.rawPath}?${iEvent.queryString}`
      : iEvent.rawPath,
    `${scheme}://${iEvent.headers.host}`
  ).toString();

  return { ...iEvent, url } satisfies InternalEvent;
}

function convertFromApigV1Event(event: APIGatewayProxyEvent) {
  const { path, body, httpMethod, requestContext, isBase64Encoded } = event;
  const headers = normalizeApigV1Headers(event);
  return {
    type: "v1" as const,
    method: httpMethod,
    rawPath: path,
    queryString: normalizeApigV1QueryParams(event),
    body: Buffer.from(body ?? "", isBase64Encoded ? "base64" : "utf8"),
    headers,
    remoteAddress: requestContext.identity.sourceIp,
  };
}

function convertFromApigV2Event(event: APIGatewayProxyEventV2) {
  const { rawPath, rawQueryString, requestContext } = event;
  return {
    type: "v2" as const,
    method: requestContext.http.method,
    rawPath,
    queryString: rawQueryString,
    body: normalizeApigV2Body(event),
    headers: normalizeApigV2Headers(event),
    remoteAddress: requestContext.http.sourceIp,
  };
}

function convertFromCfEvent(event: CloudFrontRequestEvent) {
  const { method, uri, querystring, body, clientIp } =
    event.Records[0].cf.request;
  return {
    type: "cf" as const,
    method,
    rawPath: uri,
    queryString: querystring,
    body: Buffer.from(
      body?.data ?? "",
      body?.encoding === "base64" ? "base64" : "utf8"
    ),
    headers: normalizeCfHeaders(event),
    remoteAddress: clientIp,
  };
}

export async function convertTo({
  type,
  response,
  responseStream,
  cookies: appCookies,
}: InternalResultInput) {
  // Parse headers
  const headers: Record<string, string[]> = {};
  response.headers.forEach((value, key) => {
    headers[key] = headers[key] || [];
    headers[key].push(value);
  });

  // Parse cookies
  const cookies: string[] = [];
  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader) {
    cookies.push(...splitCookiesString(setCookieHeader));
  }
  if (appCookies) {
    cookies.push(...appCookies);
  }
  if (cookies.length > 0) {
    headers["set-cookie"] = [cookies.join(";")];
  }

  // Parse isBase64Encoded
  const isBase64Encoded = isBinaryContentType(
    Array.isArray(headers["content-type"])
      ? headers["content-type"][0]
      : headers["content-type"]
  );

  // Build streaming result
  if (type === "v2" && responseStream) {
    return convertToApigV2StreamingResult({
      statusCode: response.status,
      headers,
      body: response.body,
      responseStream,
    });
  }

  // Build non-streaming result
  const result = {
    type,
    statusCode: response.status,
    headers,
    isBase64Encoded,
    body: isBase64Encoded
      ? Buffer.from(await response.arrayBuffer()).toString("base64")
      : await response.text(),
  };
  if (type === "v2") {
    return convertToApigV2Result(result);
  } else if (type === "v1") {
    return convertToApigV1Result(result);
  } else if (type === "cf") {
    return convertToCfResult(result);
  }
  throw new Error("Unsupported event type");
}

function convertToApigV1Result(result: InternalResult): APIGatewayProxyResult {
  const headers: Record<string, string> = {};
  const multiValueHeaders: Record<string, string[]> = {};
  Object.entries(result.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      multiValueHeaders[key] = value;
    } else {
      if (value === null) {
        headers[key] = "";
        return;
      }
      headers[key] = value;
    }
  });
  const response: APIGatewayProxyResult = {
    statusCode: result.statusCode,
    headers,
    body: result.body,
    isBase64Encoded: result.isBase64Encoded,
    multiValueHeaders,
  };
  debug(response);
  return response;
}

function convertToApigV2Result(
  result: InternalResult
): APIGatewayProxyResultV2 {
  const headers: Record<string, string> = {};
  Object.entries(result.headers)
    .filter(([key]) => key.toLowerCase() !== "set-cookie")
    .forEach(([key, value]) => {
      if (value === null) {
        headers[key] = "";
        return;
      }
      headers[key] = Array.isArray(value) ? value.join(", ") : value.toString();
    });
  const response: APIGatewayProxyResultV2 = {
    statusCode: result.statusCode,
    headers,
    cookies: result.headers["set-cookie"] as string[] | undefined,
    body: result.body,
    isBase64Encoded: result.isBase64Encoded,
  };
  debug(response);
  return response;
}

function convertToApigV2StreamingResult({
  statusCode,
  headers: rawHeaders,
  body,
  responseStream,
}: InternalStreamingResult) {
  const headers: Record<string, string> = {};
  Object.entries(rawHeaders).forEach(([key, value]) => {
    if (value === null) {
      headers[key] = "";
      return;
    }
    headers[key] = Array.isArray(value) ? value.join(", ") : value.toString();
  });
  const metadata = { statusCode, headers };
  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  if (!body) {
    responseStream.write(0);
    responseStream.end();
    return;
  }

  if (body.locked) {
    responseStream.write(
      "Fatal error: Response body is locked. " +
        `This can happen when the response was already read (for example through 'response.json()' or 'response.text()').`
    );
    responseStream.end();
    return;
  }

  const reader = body.getReader();

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

function convertToCfResult(result: InternalResult): CloudFrontRequestResult {
  const headers: CloudFrontHeaders = {};
  Object.entries(result.headers)
    .filter(([key]) => key.toLowerCase() !== "content-length")
    .forEach(([key, value]) => {
      headers[key] = [
        ...(headers[key] || []),
        ...(Array.isArray(value)
          ? value.map((v) => ({ key, value: v }))
          : [{ key, value: value.toString() }]),
      ];
    });
  const response: CloudFrontRequestResult = {
    status: result.statusCode.toString(),
    statusDescription: "OK",
    headers,
    bodyEncoding: result.isBase64Encoded ? "base64" : "text",
    body: result.body,
  };
  debug(response);
  return response;
}

function normalizeApigV2Headers(event: APIGatewayProxyEventV2) {
  const { headers: rawHeaders, cookies } = event;

  const headers: Record<string, string> = {};

  if (Array.isArray(cookies)) {
    headers["cookie"] = cookies.join("; ");
  }

  for (const [key, value] of Object.entries(rawHeaders || {})) {
    headers[key.toLowerCase()] = value!;
  }

  return headers;
}

function normalizeApigV2Body(event: APIGatewayProxyEventV2): Buffer {
  const { body, isBase64Encoded } = event;
  if (Buffer.isBuffer(body)) {
    return body;
  } else if (typeof body === "string") {
    return Buffer.from(body, isBase64Encoded ? "base64" : "utf8");
  } else if (typeof body === "object") {
    return Buffer.from(JSON.stringify(body));
  }
  return Buffer.from("", "utf8");
}

function normalizeApigV1QueryParams(event: APIGatewayProxyEvent) {
  const params = new URLSearchParams();
  if (event.multiValueQueryStringParameters) {
    for (const [key, value] of Object.entries(
      event.multiValueQueryStringParameters
    )) {
      if (value !== undefined) {
        for (const v of value) {
          params.append(key, v);
        }
      }
    }
  }
  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
  }
  const value = params.toString();
  return value ?? "";
}

function normalizeApigV1Headers(event: APIGatewayProxyEvent) {
  event.multiValueHeaders;
  const headers: Record<string, string> = {};

  for (const [key, values] of Object.entries(event.multiValueHeaders)) {
    if (values) {
      headers[key.toLowerCase()] = values.join(",");
    }
  }
  for (const [key, value] of Object.entries(event.headers)) {
    if (value) {
      headers[key.toLowerCase()] = value;
    }
  }

  return headers;
}

function normalizeCfHeaders(event: CloudFrontRequestEvent) {
  const headers: Record<string, string> = {};

  const rawHeaders = event.Records[0].cf.request.headers;
  for (const [key, values] of Object.entries(rawHeaders)) {
    for (const { value } of values) {
      if (value) {
        headers[key.toLowerCase()] = value;
      }
    }
  }

  return headers;
}
