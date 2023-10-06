// This is a custom Lambda URL handler which imports the Remix server
// build and performs the Remix server rendering.

// We have to ensure that our polyfills are imported prior to any other modules
// which may depend on them;
import { installGlobals } from "@remix-run/node";
installGlobals();

import {
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
  if (event.headers["x-forwarded-host"]) {
    event.headers.host = event.headers["x-forwarded-host"];
  }

  const search = event.rawQueryString.length ? `?${event.rawQueryString}` : "";
  const url = new URL(event.rawPath + search, `https://${event.headers.host}`);
  const isFormData = event.headers["content-type"]?.includes(
    "multipart/form-data"
  );

  // Build headers
  const headers = new Headers();
  for (let [header, value] of Object.entries(event.headers)) {
    if (value) {
      headers.append(header, value);
    }
  }

  return new Request(url.href, {
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

function sendStreamRemixResponse(nodeResponse, streamResponse) {
  const { statusCode, headers, isBase64Encoded } = parseResponse(nodeResponse);

  streamResponse = awslambda.HttpResponseStream.from(streamResponse, {
    statusCode: nodeResponse.status,
    headers: Object.fromEntries(nodeResponse.headers.entries()),
    isBase64Encoded: isBinaryType(nodeResponse.headers.get("Content-Type")),
  });

  if (!nodeResponse.body) {
    return streamResponse.write("");
  }

  return writeReadableStreamToWritable(nodeResponse.body, streamResponse);
}

const createApigHandler = (build) => {
  const requestHandler = createNodeRequestHandler(build, process.env.NODE_ENV);

  return awslambda.streamifyResponse(async (event, streamResponse) => {
    const request = convertApigRequestToNode(event);
    const response = await requestHandler(request);

    sendStreamRemixResponse(response, streamResponse);

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers),
      body: response.body,
    };
  });
};

export const handler = createApigHandler(remixServerBuild);
