// This is a custom CloudFront Lambda@Edge handler which we will utilise to wrap
// the Remix server build with.
//
// It additionally exposes an environment variable token which is used by our
// Lambda Replacer code to inject the appropriate environment variables. This
// strategy is required as Lambda@Edge doesn't natively support environment
// variables - they need to be inlined.
//
// Shout out to the Architect team, from which we drew inspiration.

const { installGlobals, readableStreamToString } = require("@remix-run/node");
installGlobals();

const {
  Headers: NodeHeaders,
  Request: NodeRequest,
} = require("@remix-run/node");
const {
  createRequestHandler: createRemixRequestHandler,
} = require("@remix-run/server-runtime");
const { URL } = require("url");
const remixServerBuild = require("./index.js");

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

function createNodeRequestHeaders(requestHeaders) {
  const headers = new NodeHeaders();

  for (const [key, values] of Object.entries(requestHeaders)) {
    for (const { value } of values) {
      if (value) {
        headers.append(key, value);
      }
    }
  }

  return headers;
}

function createNodeRequest(event) {
  const request = event.Records[0].cf.request;

  const host = request.headers["host"]
    ? request.headers["host"][0].value
    : undefined;
  const search = request.querystring.length ? `?${request.querystring}` : "";
  const url = new URL(request.uri + search, `https://${host}`);

  return new NodeRequest(url.toString(), {
    method: request.method,
    headers: createNodeRequestHeaders(request.headers),
    body: request.body?.data
      ? request.body.encoding === "base64"
        ? Buffer.from(request.body.data, "base64").toString()
        : request.body.data
      : undefined,
  });
}

function createCloudFrontResponseHeaders(responseHeaders) {
  const headers = {};
  const rawHeaders = responseHeaders.raw();

  for (const key in rawHeaders) {
    const value = rawHeaders[key];
    for (const v of value) {
      headers[key] = [...(headers[key] || []), { key, value: v }];
    }
  }

  return headers;
}

function createCloudFrontRequestHandler({
  remixServerBuild,
  getLoadContext,
  mode = process.env.NODE_ENV,
}) {
  const remixRequestHandler = createRemixRequestHandler(remixServerBuild, mode);

  return async (event, _context) => {
    const request = createNodeRequest(event);

    const loadContext =
      typeof getLoadContext === "function" ? getLoadContext(event) : undefined;

    const response = await remixRequestHandler(request, loadContext);

    const contentType = response.headers.get("Content-Type");
    const isBase64Encoded = isBinaryType(contentType);

    let body;

    if (response.body) {
      if (isBase64Encoded) {
        body = await readableStreamToString(response.body, "base64");
      } else {
        body = await response.text();
      }
    }

    return {
      status: String(response.status),
      headers: createCloudFrontResponseHeaders(response.headers),
      bodyEncoding: isBase64Encoded ? "base64" : "text",
      body,
    };
  };
}

const cloudFrontRequestHandler = createCloudFrontRequestHandler({
  remixServerBuild,
});

exports.handler = async function handler(...args) {
  try {
    // The right hand side of this assignment will get replaced during
    // deployment with an object of environment key-value pairs;
    const environment = "{{ _SST_REMIX_SITE_ENVIRONMENT_ }}";

    process.env = { ...process.env, ...environment };
  } catch (e) {
    console.log("Failed to set SST RemixSite environment.");
    console.log(e);
  }

  return await cloudFrontRequestHandler(...args);
};
