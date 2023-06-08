import fs from "node:fs";
import path from "node:path";
import { installPolyfills } from "@sveltejs/kit/node/polyfills";
import type { Server as ServerType } from "@sveltejs/kit/types";
// @ts-ignore
import { Server } from "../index.js";
// @ts-ignore
import { manifest } from "../manifest.js";
// @ts-ignore
import prerenderedFiles from "./prerendered-file-list.js";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEvent,
  CloudFrontRequestEvent,
} from "aws-lambda";
import { InternalEvent, convertFrom, convertTo } from "./event-mapper.js";
import { debug } from "./logger.js";
import { isBinaryContentType } from "./binary.js";

installPolyfills();

const app: ServerType = new Server(manifest);
await app.init({ env: process.env as Record<string, string> });

export async function handler(
  event: APIGatewayProxyEventV2 | CloudFrontRequestEvent | APIGatewayProxyEvent
) {
  debug("event", event);

  // Parse Lambda event
  const internalEvent = convertFrom(event);

  // Set correct host header
  if (internalEvent.headers["x-forwarded-host"]) {
    internalEvent.headers.host = internalEvent.headers["x-forwarded-host"];
  }

  // Check request is for prerendered file
  if (internalEvent.method === "GET") {
    const filePath = isPrerenderedFile(internalEvent.rawPath);
    if (filePath) {
      return internalEvent.type === "cf"
        ? formatCloudFrontPrerenderedResponse(
            event as CloudFrontRequestEvent,
            filePath
          )
        : formatAPIGatewayPrerenderedResponse(internalEvent, filePath);
    }
  }

  // Process request
  const requestUrl = `https://${internalEvent.headers.host}${internalEvent.url}`;
  const requestProps = {
    method: internalEvent.method,
    headers: internalEvent.headers,
    body: ["GET", "HEAD"].includes(internalEvent.method)
      ? undefined
      : internalEvent.body,
  };
  debug("request", requestUrl, requestProps);
  const request = new Request(requestUrl, requestProps);
  const response: Response = await app.respond(request, {
    getClientAddress: () => internalEvent.remoteAddress,
  });
  debug("response", response);

  //Parse the response into lambda proxy response
  if (response) {
    const headers: Record<string, string[]> = {};
    response.headers.forEach((value, key) => {
      headers[key] = headers[key] || [];
      headers[key].push(value);
    });
    const isBase64Encoded = isBinaryContentType(
      Array.isArray(headers["content-type"])
        ? headers["content-type"][0]
        : headers["content-type"]
    );
    const body = isBase64Encoded
      ? Buffer.from(await response.arrayBuffer()).toString("base64")
      : await response.text();
    return convertTo({
      type: internalEvent.type,
      statusCode: response.status,
      headers,
      isBase64Encoded,
      body,
    });
  }
  return {
    statusCode: 404,
    body: "Not found.",
  };
}

function isPrerenderedFile(uri: string) {
  // remove leading and trailing slashes
  uri = uri.replace(/^\/|\/$/g, "");

  if (uri === "") {
    return prerenderedFiles.includes("index.html") ? "index.html" : undefined;
  }

  if (prerenderedFiles.includes(uri)) {
    return uri;
  }
  if (prerenderedFiles.includes(uri + "/index.html")) {
    return uri + "/index.html";
  }
  if (prerenderedFiles.includes(uri + ".html")) {
    return uri + ".html";
  }
}

function formatCloudFrontPrerenderedResponse(
  event: CloudFrontRequestEvent,
  filePath: string
) {
  const request = event.Records[0].cf.request;
  request.uri = `/${filePath}`;
  return request;
}

function formatAPIGatewayPrerenderedResponse(
  internalEvent: InternalEvent,
  filePath: string
) {
  return convertTo({
    type: internalEvent.type,
    statusCode: 200,
    headers: {
      "content-type": "text/html",
      "cache-control": "public, max-age=0, s-maxage=31536000, must-revalidate",
    },
    isBase64Encoded: false,
    body: fs.readFileSync(path.join("prerendered", filePath), "utf8"),
  });
}
