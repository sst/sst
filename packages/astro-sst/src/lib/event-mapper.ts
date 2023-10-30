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
import { splitCookiesString, parse, Cookie } from "set-cookie-parser";
import { isBinaryContentType } from "./binary.js";
import zlib from "zlib";

export type InternalEvent = {
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
  headers: Record<string, string>;
  cookies: Cookie[];
  body: string;
  isBase64Encoded: boolean;
};

type InternalStreamingResult = {
  statusCode: number;
  headers: Record<string, string>;
  cookies: Cookie[];
  body: ReadableStream | null;
  responseStream: ResponseStream;
  isBase64Encoded: boolean;
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
  // Parse headers (except cookies)
  const headers: { [key: string]: string } = Array.from(
    response.headers.entries()
  )
    .filter(([key]) => key !== "set-cookie")
    .reduce((headers, [key, value]) => {
      headers[key] = value;
      return headers;
    }, {} as { [key: string]: string });

  // Parse cookies
  const cookies = parse(
    [
      ...splitCookiesString(response.headers.getSetCookie() ?? undefined),
      ...(appCookies ?? []),
    ],
    { decodeValues: false, map: false, silent: true }
  );

  // Parse isBase64Encoded
  const isBase64Encoded = isBinaryContentType(headers["content-type"]);

  // Build streaming result
  if (type === "v2" && responseStream) {
    return convertToApigV2StreamingResult({
      statusCode: response.status,
      headers,
      body: response.body,
      cookies,
      responseStream,
      isBase64Encoded,
    });
  }

  // Build non-streaming result
  const result = {
    type,
    statusCode: response.status,
    headers,
    cookies,
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

function convertToApigV1Result({
  headers,
  statusCode,
  body,
  isBase64Encoded,
  cookies,
}: InternalResult): APIGatewayProxyResult {
  const multiValueHeaders: Record<string, string[]> = {};
  if (cookies.length > 0) {
    multiValueHeaders["set-cookie"] = stringifyCookies(cookies);
  }

  const response: APIGatewayProxyResult = {
    statusCode,
    headers,
    multiValueHeaders,
    body,
    isBase64Encoded,
  };

  return response;
}

function convertToApigV2Result({
  headers,
  statusCode,
  body,
  isBase64Encoded,
  cookies,
}: InternalResult): APIGatewayProxyResultV2 {
  const response: APIGatewayProxyResultV2 = {
    statusCode,
    headers,
    cookies: cookies.length > 0 ? stringifyCookies(cookies) : undefined,
    body,
    isBase64Encoded,
  };

  return response;
}

function convertToApigV2StreamingResult({
  statusCode,
  headers,
  cookies,
  body,
  responseStream,
  isBase64Encoded,
}: InternalStreamingResult) {
  if (!isBase64Encoded) {
    headers["content-encoding"] = "gzip";
  }

  const metadata = {
    statusCode,
    headers,
  };
  if (cookies.length > 0) {
    metadata.headers["set-cookie"] = stringifyCookies(cookies).join(", ");
  }
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

  let streamToWrite: ResponseStream | zlib.Gzip;
  if (!isBase64Encoded) {
    const gzip = zlib.createGzip();
    gzip.pipe(responseStream);
    streamToWrite = gzip;
  } else {
    streamToWrite = responseStream;
  }

  const cancel = (error?: Error) => {
    streamToWrite.off("close", cancel);
    streamToWrite.off("error", cancel);

    // If the reader has already been interrupted with an error earlier,
    // then it will appear here, it is useless, but it needs to be catch.
    reader.cancel(error).catch(() => {});

    if (!isBase64Encoded) {
      // Unpipe the gzip stream to ensure no more data is written
      (streamToWrite as zlib.Gzip).unpipe(responseStream);

      if (error) {
        streamToWrite.destroy(error);
      } else {
        // In case there's no error, just close the gzip stream
        streamToWrite.end();
      }
    } else if (error) {
      responseStream.destroy(error);
    }
  };

  streamToWrite.on("close", cancel);
  streamToWrite.on("error", cancel);

  next();
  async function next() {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!isBase64Encoded) {
          const writer = streamToWrite as zlib.Gzip;
          const result = writer.write(value, () => {
            writer.flush(zlib.constants.Z_SYNC_FLUSH);
          });
          if (!result) writer.once("drain", next);
        } else {
          if (!streamToWrite.write(value)) {
            streamToWrite.once("drain", next);
            return;
          }
        }
      }

      streamToWrite.end();
    } catch (error) {
      cancel(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

function convertToCfResult({
  statusCode,
  headers,
  cookies,
  body,
  isBase64Encoded,
}: InternalResult): CloudFrontRequestResult {
  const combinedHeaders = Object.entries(headers).reduce(
    (headers, [key, value]) => {
      headers[key.toLowerCase()] = [{ key, value }];
      return headers;
    },
    {} as CloudFrontHeaders
  );
  combinedHeaders["set-cookie"] = stringifyCookies(cookies).map((cookie) => ({
    key: "set-cookie",
    value: cookie,
  }));

  const response: CloudFrontRequestResult = {
    status: statusCode.toString(),
    statusDescription: "OK",
    headers: Object.entries(headers).reduce((headers, [key, value]) => {
      headers[key.toLowerCase()] = [{ key, value }];
      return headers;
    }, {} as CloudFrontHeaders),
    bodyEncoding: isBase64Encoded ? "base64" : "text",
    body: body,
  };

  return response;
}

function normalizeApigV2Headers({ headers, cookies }: APIGatewayProxyEventV2) {
  const combinedHeaders: Record<string, string> = {};

  if (Array.isArray(cookies)) {
    combinedHeaders["cookie"] = cookies.join("; ");
  }

  for (const [key, value] of Object.entries(headers ?? {})) {
    combinedHeaders[key.toLowerCase()] = value!;
  }

  return combinedHeaders;
}

function normalizeApigV2Body({
  body,
  isBase64Encoded,
}: APIGatewayProxyEventV2): Buffer {
  if (Buffer.isBuffer(body)) {
    return body;
  } else if (typeof body === "string") {
    return Buffer.from(body, isBase64Encoded ? "base64" : "utf8");
  } else if (typeof body === "object") {
    return Buffer.from(JSON.stringify(body));
  }
  return Buffer.from("", "utf8");
}

function normalizeApigV1QueryParams({
  multiValueQueryStringParameters,
  queryStringParameters,
}: APIGatewayProxyEvent) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(
    multiValueQueryStringParameters ?? {}
  )) {
    if (value !== undefined) {
      for (const v of value) {
        params.append(key, v);
      }
    }
  }
  for (const [key, value] of Object.entries(queryStringParameters ?? {})) {
    if (value !== undefined) {
      params.append(key, value);
    }
  }
  const value = params.toString();
  return value ?? "";
}

function normalizeApigV1Headers({
  multiValueHeaders,
  headers,
}: APIGatewayProxyEvent) {
  const combinedHeaders: Record<string, string> = {};

  for (const [key, values] of Object.entries(multiValueHeaders ?? {})) {
    if (values) {
      combinedHeaders[key.toLowerCase()] = values.join(",");
    }
  }
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (value) {
      combinedHeaders[key.toLowerCase()] = value;
    }
  }

  return combinedHeaders;
}

function normalizeCfHeaders(event: CloudFrontRequestEvent) {
  const combinedHeaders: Record<string, string> = {};

  for (const [key, values] of Object.entries(
    event.Records[0].cf.request.headers
  )) {
    for (const { value } of values) {
      if (value) {
        combinedHeaders[key.toLowerCase()] = value;
      }
    }
  }

  return combinedHeaders;
}

function stringifyCookies(cookies: Cookie[]) {
  return cookies.map(
    (cookie) =>
      `${cookie.name}=${cookie.value};${Object.entries(cookie)
        .filter(
          ([key, value]) =>
            key !== "value" &&
            key !== "name" &&
            typeof value !== "undefined" &&
            value !== false
        )
        .map(([key, value]) =>
          typeof value === "boolean"
            ? `${key};`
            : typeof value.toUTCString !== "undefined"
            ? `${key}=${value.toUTCString()};`
            : `${key}=${value};`
        )
        .join("")}`
  );
}
