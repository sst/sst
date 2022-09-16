import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import type { IncomingMessage } from "http";
import type { NextApiRequestCookies } from 'next/dist/server/api-utils';

const Stream = require("stream");
const http = require("http");

declare type Req = IncomingMessage & {
  cookies?: NextApiRequestCookies;
};

// compat layer between aws lambda APIGWv2 payload and nextjs
// PROBABLY WRONG
// based on https://www.npmjs.com/package/@sls-next/next-aws-lambda
export const reqResMapper = (event: APIGatewayProxyEventV2, callback) => {
  const base64Support = process.env.BINARY_SUPPORT === "yes";
  const response: Partial<APIGatewayProxyResult & { body: any }> = {
    isBase64Encoded: base64Support,
  };
  let responsePromise;

  // build request
  const newStream = new Stream.Readable();
  const req: Req = Object.assign(newStream, http.IncomingMessage.prototype);
  req.url = event.rawPath || "";
  req.method = event.requestContext.http.method;
  req.headers = event.headers;
  req.cookies = Object.fromEntries(event.cookies?.map((c) => c.split("=")) || []);

  // build response
  const res = new Stream();
  Object.defineProperty(res, "statusCode", {
    get() {
      return response.statusCode;
    },
    set(statusCode) {
      response.statusCode = statusCode;
    }
  });
  res.headers = {};
  res.writeHead = (status, headers) => {
    response.statusCode = status;
    if (headers) res.headers = Object.assign(res.headers, headers);
  };
  res.write = (chunk) => {
    if (!response.body) {
      response.body = Buffer.from("");
    }

    response.body = Buffer.concat([
      Buffer.isBuffer(response.body)
        ? response.body
        : Buffer.from(response.body),
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    ]);
  };
  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value;
  };
  res.removeHeader = (name) => {
    delete res.headers[name.toLowerCase()];
  };
  res.getHeader = (name) => {
    return res.headers[name.toLowerCase()];
  };
  res.getHeaders = () => {
    return res.headers;
  };
  res.hasHeader = (name) => {
    return !!res.getHeader(name);
  };

  const onResEnd = (callback, resolve) => (text) => {
    if (text) res.write(text);
    if (!res.statusCode) {
      res.statusCode = 200;
    }

    if (response.body) {
      response.body = Buffer.from(response.body).toString(
        base64Support ? "base64" : undefined
      );
    }
    response.headers = res.headers;
    res.writeHead(response.statusCode);

    if (callback) {
      callback(null, response);
    } else {
      resolve(response);
    }
  };

  if (typeof callback === "function") {
    res.end = onResEnd(callback, null);
  } else {
    responsePromise = new Promise((resolve) => {
      res.end = onResEnd(null, resolve);
    });
  }

  if (event.body) {
    req.push(event.body, event.isBase64Encoded ? "base64" : undefined);
  }

  req.push(null);

  return { req, res, responsePromise };
};

