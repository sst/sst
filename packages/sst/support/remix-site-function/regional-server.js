// This is a custom Lambda URL handler which imports the Remix server
// build and performs the Remix server rendering.

// We have to ensure that our polyfills are imported prior to any other modules
// which may depend on them;
import { installGlobals } from "@remix-run/node";
installGlobals();

import {
  Headers as NodeHeaders,
  Request as NodeRequest,
  createRequestHandler as createNodeRequestHandler,
  readableStreamToString,
} from "@remix-run/node";

// Import the server build that was produced by `remix build`;
import * as remixServerBuild from "./index.js";

/**
 * Common binary MIME types
 */
const binaryTypes = [
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
];

function isBinaryType(contentType) {
  if (!contentType) return false;
  return binaryTypes.some((t) => contentType.includes(t));
}

function convertApigRequestToNode(event) {
  let host = event.headers["x-forwarded-host"] || event.headers.host;
  let search = event.rawQueryString.length ? `?${event.rawQueryString}` : "";
  let scheme = "https";
  let url = new URL(event.rawPath + search, `${scheme}://${host}`);
  let isFormData = event.headers["content-type"]?.includes(
    "multipart/form-data"
  );

  // Build headers
  const headers = new NodeHeaders();
  for (let [header, value] of Object.entries(event.headers)) {
    if (value) {
      headers.append(header, value);
    }
  }

  return new NodeRequest(url.href, {
    method: event.requestContext.http.method,
    headers,
    body:
      event.body && event.isBase64Encoded
        ? isFormData
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "base64").toString()
        : event.body,
  });
}

async function convertNodeResponseToApig(nodeResponse) {
  const contentType = nodeResponse.headers.get("Content-Type");
  const isBase64Encoded = isBinaryType(contentType);

  // Build cookies
  // note: AWS API Gateway will send back set-cookies outside of response headers.
  const cookies = [];
  for (let [key, values] of Object.entries(nodeResponse.headers.raw())) {
    if (key.toLowerCase() === "set-cookie") {
      for (let value of values) {
        cookies.push(value);
      }
    }
  }

  if (cookies.length) {
    nodeResponse.headers.delete("Set-Cookie");
  }

  // Build body
  let body;
  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, "base64");
    } else {
      body = await nodeResponse.text();
    }
  }

  return {
    statusCode: nodeResponse.status,
    headers: Object.fromEntries(nodeResponse.headers.entries()),
    cookies,
    body,
    isBase64Encoded,
  };
}

const createApigHandler = (build) => {
  const requestHandler = createNodeRequestHandler(build, process.env.NODE_ENV);

  return async (event) => {
    const request = convertApigRequestToNode(event);
    const response = await requestHandler(request);
    return convertNodeResponseToApig(response);
  };
};

export const handler = createApigHandler(remixServerBuild);
