import { createRequire as topLevelCreateRequire } from 'module';const require = topLevelCreateRequire(import.meta.url);import url from 'url';const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/finish.js
var require_finish = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/finish.js"(exports, module) {
    "use strict";
    module.exports = async function finish(item, transform, ...details) {
      await new Promise((resolve, reject) => {
        if (item.finished || item.complete) {
          resolve();
          return;
        }
        let finished = false;
        function done(err) {
          if (finished) {
            return;
          }
          finished = true;
          item.removeListener("error", done);
          item.removeListener("end", done);
          item.removeListener("finish", done);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
        item.once("error", done);
        item.once("end", done);
        item.once("finish", done);
      });
      if (typeof transform === "function") {
        await transform(item, ...details);
      } else if (typeof transform === "object" && transform !== null) {
        Object.assign(item, transform);
      }
      return item;
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/response.js
var require_response = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/response.js"(exports, module) {
    "use strict";
    var http = __require("http");
    var headerEnd = "\r\n\r\n";
    var BODY = Symbol();
    var HEADERS = Symbol();
    function getString(data) {
      if (Buffer.isBuffer(data)) {
        return data.toString("utf8");
      } else if (typeof data === "string") {
        return data;
      } else {
        throw new Error(`response.write() of unexpected type: ${typeof data}`);
      }
    }
    function addData(stream, data) {
      if (Buffer.isBuffer(data) || typeof data === "string" || data instanceof Uint8Array) {
        stream[BODY].push(Buffer.from(data));
      } else {
        throw new Error(`response.write() of unexpected type: ${typeof data}`);
      }
    }
    module.exports = class ServerlessResponse extends http.ServerResponse {
      static from(res) {
        const response = new ServerlessResponse(res);
        response.statusCode = res.statusCode;
        response[HEADERS] = res.headers;
        response[BODY] = [Buffer.from(res.body)];
        response.end();
        return response;
      }
      static body(res) {
        return Buffer.concat(res[BODY]);
      }
      static headers(res) {
        const headers = typeof res.getHeaders === "function" ? res.getHeaders() : res._headers;
        return Object.assign(headers, res[HEADERS]);
      }
      get headers() {
        return this[HEADERS];
      }
      setHeader(key, value) {
        if (this._wroteHeader) {
          this[HEADERS][key] = value;
        } else {
          super.setHeader(key, value);
        }
      }
      writeHead(statusCode, reason, obj) {
        const headers = typeof reason === "string" ? obj : reason;
        for (const name in headers) {
          this.setHeader(name, headers[name]);
          if (!this._wroteHeader) {
            break;
          }
        }
        super.writeHead(statusCode, reason, obj);
      }
      constructor({ method }) {
        super({ method });
        this[BODY] = [];
        this[HEADERS] = {};
        this.useChunkedEncodingByDefault = false;
        this.chunkedEncoding = false;
        this._header = "";
        this.assignSocket({
          _writableState: {},
          writable: true,
          on: Function.prototype,
          removeListener: Function.prototype,
          destroy: Function.prototype,
          cork: Function.prototype,
          uncork: Function.prototype,
          write: (data, encoding, cb) => {
            if (typeof encoding === "function") {
              cb = encoding;
              encoding = null;
            }
            if (this._header === "" || this._wroteHeader) {
              addData(this, data);
            } else {
              const string = getString(data);
              const index = string.indexOf(headerEnd);
              if (index !== -1) {
                const remainder = string.slice(index + headerEnd.length);
                if (remainder) {
                  addData(this, remainder);
                }
                this._wroteHeader = true;
              }
            }
            if (typeof cb === "function") {
              cb();
            }
          }
        });
      }
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/framework/get-framework.js
var require_get_framework = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/framework/get-framework.js"(exports, module) {
    "use strict";
    var http = __require("http");
    var Response = require_response();
    function common(cb) {
      return (request) => {
        const response = new Response(request);
        cb(request, response);
        return response;
      };
    }
    module.exports = function getFramework(app) {
      if (app instanceof http.Server) {
        return (request) => {
          const response = new Response(request);
          app.emit("request", request, response);
          return response;
        };
      }
      if (typeof app.callback === "function") {
        return common(app.callback());
      }
      if (typeof app.handle === "function") {
        return common((request, response) => {
          app.handle(request, response);
        });
      }
      if (typeof app.handler === "function") {
        return common((request, response) => {
          app.handler(request, response);
        });
      }
      if (typeof app._onRequest === "function") {
        return common((request, response) => {
          app._onRequest(request, response);
        });
      }
      if (typeof app === "function") {
        return common(app);
      }
      if (app.router && typeof app.router.route == "function") {
        return common((req, res) => {
          const { url, method, headers, body } = req;
          app.router.route({ url, method, headers, body }, res);
        });
      }
      if (app._core && typeof app._core._dispatch === "function") {
        return common(app._core._dispatch({
          app
        }));
      }
      if (typeof app.inject === "function") {
        return async (request) => {
          const { method, url, headers, body } = request;
          const res = await app.inject({ method, url, headers, payload: body });
          return Response.from(res);
        };
      }
      if (typeof app.main === "function") {
        return common(app.main);
      }
      throw new Error("Unsupported framework");
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/clean-up-event.js
var require_clean_up_event = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/clean-up-event.js"(exports, module) {
    "use strict";
    function removeBasePath(path3 = "/", basePath) {
      if (basePath) {
        const basePathIndex = path3.indexOf(basePath);
        if (basePathIndex > -1) {
          return path3.substr(basePathIndex + basePath.length) || "/";
        }
      }
      return path3;
    }
    function isString(value) {
      return typeof value === "string" || value instanceof String;
    }
    function specialDecodeURIComponent(value) {
      if (!isString(value)) {
        return value;
      }
      let decoded;
      try {
        decoded = decodeURIComponent(value.replace(/[+]/g, "%20"));
      } catch (err) {
        decoded = value.replace(/[+]/g, "%20");
      }
      return decoded;
    }
    function recursiveURLDecode(value) {
      if (isString(value)) {
        return specialDecodeURIComponent(value);
      } else if (Array.isArray(value)) {
        const decodedArray = [];
        for (let index in value) {
          decodedArray.push(recursiveURLDecode(value[index]));
        }
        return decodedArray;
      } else if (value instanceof Object) {
        const decodedObject = {};
        for (let key of Object.keys(value)) {
          decodedObject[specialDecodeURIComponent(key)] = recursiveURLDecode(value[key]);
        }
        return decodedObject;
      }
      return value;
    }
    module.exports = function cleanupEvent(evt, options) {
      const event = evt || {};
      event.requestContext = event.requestContext || {};
      event.body = event.body || "";
      event.headers = event.headers || {};
      if ("elb" in event.requestContext) {
        if (event.multiValueQueryStringParameters) {
          event.multiValueQueryStringParameters = recursiveURLDecode(event.multiValueQueryStringParameters);
        }
        if (event.queryStringParameters) {
          event.queryStringParameters = recursiveURLDecode(event.queryStringParameters);
        }
      }
      if (event.version === "2.0") {
        event.requestContext.authorizer = event.requestContext.authorizer || {};
        event.requestContext.http.method = event.requestContext.http.method || "GET";
        event.rawPath = removeBasePath(event.requestPath || event.rawPath, options.basePath);
      } else {
        event.requestContext.identity = event.requestContext.identity || {};
        event.httpMethod = event.httpMethod || "GET";
        event.path = removeBasePath(event.requestPath || event.path, options.basePath);
      }
      return event;
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/request.js
var require_request = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/request.js"(exports, module) {
    "use strict";
    var http = __require("http");
    module.exports = class ServerlessRequest extends http.IncomingMessage {
      constructor({ method, url, headers, body, remoteAddress }) {
        super({
          encrypted: true,
          readable: false,
          remoteAddress,
          address: () => ({ port: 443 }),
          end: Function.prototype,
          destroy: Function.prototype
        });
        if (typeof headers["content-length"] === "undefined") {
          headers["content-length"] = Buffer.byteLength(body);
        }
        Object.assign(this, {
          ip: remoteAddress,
          complete: true,
          httpVersion: "1.1",
          httpVersionMajor: "1",
          httpVersionMinor: "1",
          method,
          headers,
          body,
          url
        });
        this._read = () => {
          this.push(body);
          this.push(null);
        };
      }
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/create-request.js
var require_create_request = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/create-request.js"(exports, module) {
    "use strict";
    var URL = __require("url");
    var Request = require_request();
    function requestMethod(event) {
      if (event.version === "2.0") {
        return event.requestContext.http.method;
      }
      return event.httpMethod;
    }
    function requestRemoteAddress(event) {
      if (event.version === "2.0") {
        return event.requestContext.http.sourceIp;
      }
      return event.requestContext.identity.sourceIp;
    }
    function requestHeaders(event) {
      const initialHeader = event.version === "2.0" && Array.isArray(event.cookies) ? { cookie: event.cookies.join("; ") } : {};
      if (event.multiValueHeaders) {
        return Object.keys(event.multiValueHeaders).reduce((headers, key) => {
          headers[key.toLowerCase()] = event.multiValueHeaders[key].join(", ");
          return headers;
        }, initialHeader);
      }
      return Object.keys(event.headers).reduce((headers, key) => {
        headers[key.toLowerCase()] = event.headers[key];
        return headers;
      }, initialHeader);
    }
    function requestBody(event) {
      const type = typeof event.body;
      if (Buffer.isBuffer(event.body)) {
        return event.body;
      } else if (type === "string") {
        return Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
      } else if (type === "object") {
        return Buffer.from(JSON.stringify(event.body));
      }
      throw new Error(`Unexpected event.body type: ${typeof event.body}`);
    }
    function requestUrl(event) {
      if (event.version === "2.0") {
        return URL.format({
          pathname: event.rawPath,
          search: event.rawQueryString
        });
      }
      const query = event.multiValueQueryStringParameters || {};
      if (event.queryStringParameters) {
        Object.keys(event.queryStringParameters).forEach((key) => {
          if (Array.isArray(query[key])) {
            if (!query[key].includes(event.queryStringParameters[key])) {
              query[key].push(event.queryStringParameters[key]);
            }
          } else {
            query[key] = [event.queryStringParameters[key]];
          }
        });
      }
      return URL.format({
        pathname: event.path,
        query
      });
    }
    module.exports = (event, context, options) => {
      const method = requestMethod(event);
      const remoteAddress = requestRemoteAddress(event);
      const headers = requestHeaders(event);
      const body = requestBody(event);
      const url = requestUrl(event);
      if (typeof options.requestId === "string" && options.requestId.length > 0) {
        const header = options.requestId.toLowerCase();
        const requestId = headers[header] || event.requestContext.requestId;
        if (requestId) {
          headers[header] = requestId;
        }
      }
      const req = new Request({
        method,
        headers,
        body,
        remoteAddress,
        url
      });
      req.requestContext = event.requestContext;
      req.apiGateway = {
        event,
        context
      };
      return req;
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/is-binary.js
var require_is_binary = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/is-binary.js"(exports, module) {
    "use strict";
    var BINARY_ENCODINGS = ["gzip", "deflate", "br"];
    var BINARY_CONTENT_TYPES = (process.env.BINARY_CONTENT_TYPES || "").split(",");
    function isBinaryEncoding(headers) {
      const contentEncoding = headers["content-encoding"];
      if (typeof contentEncoding === "string") {
        return contentEncoding.split(",").some(
          (value) => BINARY_ENCODINGS.some((binaryEncoding) => value.indexOf(binaryEncoding) !== -1)
        );
      }
    }
    function isBinaryContent(headers, options) {
      const contentTypes = [].concat(
        options.binary ? options.binary : BINARY_CONTENT_TYPES
      ).map(
        (candidate) => new RegExp(`^${candidate.replace(/\*/g, ".*")}$`)
      );
      const contentType = (headers["content-type"] || "").split(";")[0];
      return !!contentType && contentTypes.some((candidate) => candidate.test(contentType));
    }
    module.exports = function isBinary(headers, options) {
      if (options.binary === false) {
        return false;
      }
      if (options.binary === true) {
        return true;
      }
      if (typeof options.binary === "function") {
        return options.binary(headers);
      }
      return isBinaryEncoding(headers) || isBinaryContent(headers, options);
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/sanitize-headers.js
var require_sanitize_headers = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/sanitize-headers.js"(exports, module) {
    "use strict";
    module.exports = function sanitizeHeaders(headers) {
      return Object.keys(headers).reduce((memo, key) => {
        const value = headers[key];
        if (Array.isArray(value)) {
          memo.multiValueHeaders[key] = value;
          if (key.toLowerCase() !== "set-cookie") {
            memo.headers[key] = value.join(", ");
          }
        } else {
          memo.headers[key] = value == null ? "" : value.toString();
        }
        return memo;
      }, {
        headers: {},
        multiValueHeaders: {}
      });
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/format-response.js
var require_format_response = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/format-response.js"(exports, module) {
    "use strict";
    var isBinary = require_is_binary();
    var Response = require_response();
    var sanitizeHeaders = require_sanitize_headers();
    module.exports = (event, response, options) => {
      const { statusCode } = response;
      const { headers, multiValueHeaders } = sanitizeHeaders(Response.headers(response));
      let cookies = [];
      if (multiValueHeaders["set-cookie"]) {
        cookies = multiValueHeaders["set-cookie"];
      }
      const isBase64Encoded = isBinary(headers, options);
      const encoding = isBase64Encoded ? "base64" : "utf8";
      let body = Response.body(response).toString(encoding);
      if (headers["transfer-encoding"] === "chunked" || response.chunkedEncoding) {
        const raw = Response.body(response).toString().split("\r\n");
        const parsed = [];
        for (let i = 0; i < raw.length; i += 2) {
          const size = parseInt(raw[i], 16);
          const value = raw[i + 1];
          if (value) {
            parsed.push(value.substring(0, size));
          }
        }
        body = parsed.join("");
      }
      let formattedResponse = { statusCode, headers, isBase64Encoded, body };
      if (event.version === "2.0" && cookies.length) {
        formattedResponse["cookies"] = cookies;
      }
      if ((!event.version || event.version === "1.0") && Object.keys(multiValueHeaders).length) {
        formattedResponse["multiValueHeaders"] = multiValueHeaders;
      }
      return formattedResponse;
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/index.js
var require_aws = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/aws/index.js"(exports, module) {
    var cleanUpEvent = require_clean_up_event();
    var createRequest = require_create_request();
    var formatResponse = require_format_response();
    module.exports = (options) => {
      return (getResponse) => async (event_, context = {}) => {
        const event = cleanUpEvent(event_, options);
        const request = createRequest(event, context, options);
        const response = await getResponse(request, event, context);
        return formatResponse(event, response, options);
      };
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/clean-up-request.js
var require_clean_up_request = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/clean-up-request.js"(exports, module) {
    "use strict";
    function getUrl({ requestPath, url }) {
      if (requestPath) {
        return requestPath;
      }
      return typeof url === "string" ? url : "/";
    }
    function getRequestContext(request) {
      const requestContext = {};
      requestContext.identity = {};
      const forwardedIp = request.headers["x-forwarded-for"];
      const clientIp = request.headers["client-ip"];
      const ip = forwardedIp ? forwardedIp : clientIp ? clientIp : "";
      if (ip) {
        requestContext.identity.sourceIp = ip.split(":")[0];
      }
      return requestContext;
    }
    module.exports = function cleanupRequest(req, options) {
      const request = req || {};
      request.requestContext = getRequestContext(req);
      request.method = request.method || "GET";
      request.url = getUrl(request);
      request.body = request.body || "";
      request.headers = request.headers || {};
      if (options.basePath) {
        const basePathIndex = request.url.indexOf(options.basePath);
        if (basePathIndex > -1) {
          request.url = request.url.substr(basePathIndex + options.basePath.length);
        }
      }
      return request;
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/create-request.js
var require_create_request2 = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/create-request.js"(exports, module) {
    "use strict";
    var url = __require("url");
    var Request = require_request();
    function requestHeaders(request) {
      return Object.keys(request.headers).reduce((headers, key) => {
        headers[key.toLowerCase()] = request.headers[key];
        return headers;
      }, {});
    }
    function requestBody(request) {
      const type = typeof request.rawBody;
      if (Buffer.isBuffer(request.rawBody)) {
        return request.rawBody;
      } else if (type === "string") {
        return Buffer.from(request.rawBody, "utf8");
      } else if (type === "object") {
        return Buffer.from(JSON.stringify(request.rawBody));
      }
      throw new Error(`Unexpected request.body type: ${typeof request.rawBody}`);
    }
    module.exports = (request) => {
      const method = request.method;
      const query = request.query;
      const headers = requestHeaders(request);
      const body = requestBody(request);
      const req = new Request({
        method,
        headers,
        body,
        url: url.format({
          pathname: request.url,
          query
        })
      });
      req.requestContext = request.requestContext;
      return req;
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/is-binary.js
var require_is_binary2 = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/is-binary.js"(exports, module) {
    "use strict";
    var BINARY_ENCODINGS = ["gzip", "deflate", "br"];
    var BINARY_CONTENT_TYPES = (process.env.BINARY_CONTENT_TYPES || "").split(",");
    function isBinaryEncoding(headers) {
      const contentEncoding = headers["content-encoding"];
      if (typeof contentEncoding === "string") {
        return contentEncoding.split(",").some(
          (value) => BINARY_ENCODINGS.some((binaryEncoding) => value.indexOf(binaryEncoding) !== -1)
        );
      }
    }
    function isBinaryContent(headers, options) {
      const contentTypes = [].concat(
        options.binary ? options.binary : BINARY_CONTENT_TYPES
      ).map(
        (candidate) => new RegExp(`^${candidate.replace(/\*/g, ".*")}$`)
      );
      const contentType = (headers["content-type"] || "").split(";")[0];
      return !!contentType && contentTypes.some((candidate) => candidate.test(contentType));
    }
    module.exports = function isBinary(headers, options) {
      if (options.binary === false) {
        return false;
      }
      if (options.binary === true) {
        return true;
      }
      if (typeof options.binary === "function") {
        return options.binary(headers);
      }
      return isBinaryEncoding(headers) || isBinaryContent(headers, options);
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/set-cookie.json
var require_set_cookie = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/set-cookie.json"(exports, module) {
    module.exports = { variations: ["set-cookie", "Set-cookie", "sEt-cookie", "SEt-cookie", "seT-cookie", "SeT-cookie", "sET-cookie", "SET-cookie", "set-Cookie", "Set-Cookie", "sEt-Cookie", "SEt-Cookie", "seT-Cookie", "SeT-Cookie", "sET-Cookie", "SET-Cookie", "set-cOokie", "Set-cOokie", "sEt-cOokie", "SEt-cOokie", "seT-cOokie", "SeT-cOokie", "sET-cOokie", "SET-cOokie", "set-COokie", "Set-COokie", "sEt-COokie", "SEt-COokie", "seT-COokie", "SeT-COokie", "sET-COokie", "SET-COokie", "set-coOkie", "Set-coOkie", "sEt-coOkie", "SEt-coOkie", "seT-coOkie", "SeT-coOkie", "sET-coOkie", "SET-coOkie", "set-CoOkie", "Set-CoOkie", "sEt-CoOkie", "SEt-CoOkie", "seT-CoOkie", "SeT-CoOkie", "sET-CoOkie", "SET-CoOkie", "set-cOOkie", "Set-cOOkie", "sEt-cOOkie", "SEt-cOOkie", "seT-cOOkie", "SeT-cOOkie", "sET-cOOkie", "SET-cOOkie", "set-COOkie", "Set-COOkie", "sEt-COOkie", "SEt-COOkie", "seT-COOkie", "SeT-COOkie", "sET-COOkie", "SET-COOkie", "set-cooKie", "Set-cooKie", "sEt-cooKie", "SEt-cooKie", "seT-cooKie", "SeT-cooKie", "sET-cooKie", "SET-cooKie", "set-CooKie", "Set-CooKie", "sEt-CooKie", "SEt-CooKie", "seT-CooKie", "SeT-CooKie", "sET-CooKie", "SET-CooKie", "set-cOoKie", "Set-cOoKie", "sEt-cOoKie", "SEt-cOoKie", "seT-cOoKie", "SeT-cOoKie", "sET-cOoKie", "SET-cOoKie", "set-COoKie", "Set-COoKie", "sEt-COoKie", "SEt-COoKie", "seT-COoKie", "SeT-COoKie", "sET-COoKie", "SET-COoKie", "set-coOKie", "Set-coOKie", "sEt-coOKie", "SEt-coOKie", "seT-coOKie", "SeT-coOKie", "sET-coOKie", "SET-coOKie", "set-CoOKie", "Set-CoOKie", "sEt-CoOKie", "SEt-CoOKie", "seT-CoOKie", "SeT-CoOKie", "sET-CoOKie", "SET-CoOKie", "set-cOOKie", "Set-cOOKie", "sEt-cOOKie", "SEt-cOOKie", "seT-cOOKie", "SeT-cOOKie", "sET-cOOKie", "SET-cOOKie", "set-COOKie", "Set-COOKie", "sEt-COOKie", "SEt-COOKie", "seT-COOKie", "SeT-COOKie", "sET-COOKie", "SET-COOKie", "set-cookIe", "Set-cookIe", "sEt-cookIe", "SEt-cookIe", "seT-cookIe", "SeT-cookIe", "sET-cookIe", "SET-cookIe", "set-CookIe", "Set-CookIe", "sEt-CookIe", "SEt-CookIe", "seT-CookIe", "SeT-CookIe", "sET-CookIe", "SET-CookIe", "set-cOokIe", "Set-cOokIe", "sEt-cOokIe", "SEt-cOokIe", "seT-cOokIe", "SeT-cOokIe", "sET-cOokIe", "SET-cOokIe", "set-COokIe", "Set-COokIe", "sEt-COokIe", "SEt-COokIe", "seT-COokIe", "SeT-COokIe", "sET-COokIe", "SET-COokIe", "set-coOkIe", "Set-coOkIe", "sEt-coOkIe", "SEt-coOkIe", "seT-coOkIe", "SeT-coOkIe", "sET-coOkIe", "SET-coOkIe", "set-CoOkIe", "Set-CoOkIe", "sEt-CoOkIe", "SEt-CoOkIe", "seT-CoOkIe", "SeT-CoOkIe", "sET-CoOkIe", "SET-CoOkIe", "set-cOOkIe", "Set-cOOkIe", "sEt-cOOkIe", "SEt-cOOkIe", "seT-cOOkIe", "SeT-cOOkIe", "sET-cOOkIe", "SET-cOOkIe", "set-COOkIe", "Set-COOkIe", "sEt-COOkIe", "SEt-COOkIe", "seT-COOkIe", "SeT-COOkIe", "sET-COOkIe", "SET-COOkIe", "set-cooKIe", "Set-cooKIe", "sEt-cooKIe", "SEt-cooKIe", "seT-cooKIe", "SeT-cooKIe", "sET-cooKIe", "SET-cooKIe", "set-CooKIe", "Set-CooKIe", "sEt-CooKIe", "SEt-CooKIe", "seT-CooKIe", "SeT-CooKIe", "sET-CooKIe", "SET-CooKIe", "set-cOoKIe", "Set-cOoKIe", "sEt-cOoKIe", "SEt-cOoKIe", "seT-cOoKIe", "SeT-cOoKIe", "sET-cOoKIe", "SET-cOoKIe", "set-COoKIe", "Set-COoKIe", "sEt-COoKIe", "SEt-COoKIe", "seT-COoKIe", "SeT-COoKIe", "sET-COoKIe", "SET-COoKIe", "set-coOKIe", "Set-coOKIe", "sEt-coOKIe", "SEt-coOKIe", "seT-coOKIe", "SeT-coOKIe", "sET-coOKIe", "SET-coOKIe", "set-CoOKIe", "Set-CoOKIe", "sEt-CoOKIe", "SEt-CoOKIe", "seT-CoOKIe", "SeT-CoOKIe", "sET-CoOKIe", "SET-CoOKIe", "set-cOOKIe", "Set-cOOKIe", "sEt-cOOKIe", "SEt-cOOKIe", "seT-cOOKIe", "SeT-cOOKIe", "sET-cOOKIe", "SET-cOOKIe", "set-COOKIe", "Set-COOKIe", "sEt-COOKIe", "SEt-COOKIe", "seT-COOKIe", "SeT-COOKIe", "sET-COOKIe", "SET-COOKIe", "set-cookiE", "Set-cookiE", "sEt-cookiE", "SEt-cookiE", "seT-cookiE", "SeT-cookiE", "sET-cookiE", "SET-cookiE", "set-CookiE", "Set-CookiE", "sEt-CookiE", "SEt-CookiE", "seT-CookiE", "SeT-CookiE", "sET-CookiE", "SET-CookiE", "set-cOokiE", "Set-cOokiE", "sEt-cOokiE", "SEt-cOokiE", "seT-cOokiE", "SeT-cOokiE", "sET-cOokiE", "SET-cOokiE", "set-COokiE", "Set-COokiE", "sEt-COokiE", "SEt-COokiE", "seT-COokiE", "SeT-COokiE", "sET-COokiE", "SET-COokiE", "set-coOkiE", "Set-coOkiE", "sEt-coOkiE", "SEt-coOkiE", "seT-coOkiE", "SeT-coOkiE", "sET-coOkiE", "SET-coOkiE", "set-CoOkiE", "Set-CoOkiE", "sEt-CoOkiE", "SEt-CoOkiE", "seT-CoOkiE", "SeT-CoOkiE", "sET-CoOkiE", "SET-CoOkiE", "set-cOOkiE", "Set-cOOkiE", "sEt-cOOkiE", "SEt-cOOkiE", "seT-cOOkiE", "SeT-cOOkiE", "sET-cOOkiE", "SET-cOOkiE", "set-COOkiE", "Set-COOkiE", "sEt-COOkiE", "SEt-COOkiE", "seT-COOkiE", "SeT-COOkiE", "sET-COOkiE", "SET-COOkiE", "set-cooKiE", "Set-cooKiE", "sEt-cooKiE", "SEt-cooKiE", "seT-cooKiE", "SeT-cooKiE", "sET-cooKiE", "SET-cooKiE", "set-CooKiE", "Set-CooKiE", "sEt-CooKiE", "SEt-CooKiE", "seT-CooKiE", "SeT-CooKiE", "sET-CooKiE", "SET-CooKiE", "set-cOoKiE", "Set-cOoKiE", "sEt-cOoKiE", "SEt-cOoKiE", "seT-cOoKiE", "SeT-cOoKiE", "sET-cOoKiE", "SET-cOoKiE", "set-COoKiE", "Set-COoKiE", "sEt-COoKiE", "SEt-COoKiE", "seT-COoKiE", "SeT-COoKiE", "sET-COoKiE", "SET-COoKiE", "set-coOKiE", "Set-coOKiE", "sEt-coOKiE", "SEt-coOKiE", "seT-coOKiE", "SeT-coOKiE", "sET-coOKiE", "SET-coOKiE", "set-CoOKiE", "Set-CoOKiE", "sEt-CoOKiE", "SEt-CoOKiE", "seT-CoOKiE", "SeT-CoOKiE", "sET-CoOKiE", "SET-CoOKiE", "set-cOOKiE", "Set-cOOKiE", "sEt-cOOKiE", "SEt-cOOKiE", "seT-cOOKiE", "SeT-cOOKiE", "sET-cOOKiE", "SET-cOOKiE", "set-COOKiE", "Set-COOKiE", "sEt-COOKiE", "SEt-COOKiE", "seT-COOKiE", "SeT-COOKiE", "sET-COOKiE", "SET-COOKiE", "set-cookIE", "Set-cookIE", "sEt-cookIE", "SEt-cookIE", "seT-cookIE", "SeT-cookIE", "sET-cookIE", "SET-cookIE", "set-CookIE", "Set-CookIE", "sEt-CookIE", "SEt-CookIE", "seT-CookIE", "SeT-CookIE", "sET-CookIE", "SET-CookIE", "set-cOokIE", "Set-cOokIE", "sEt-cOokIE", "SEt-cOokIE", "seT-cOokIE", "SeT-cOokIE", "sET-cOokIE", "SET-cOokIE", "set-COokIE", "Set-COokIE", "sEt-COokIE", "SEt-COokIE", "seT-COokIE", "SeT-COokIE", "sET-COokIE", "SET-COokIE", "set-coOkIE", "Set-coOkIE", "sEt-coOkIE", "SEt-coOkIE", "seT-coOkIE", "SeT-coOkIE", "sET-coOkIE", "SET-coOkIE", "set-CoOkIE", "Set-CoOkIE", "sEt-CoOkIE", "SEt-CoOkIE", "seT-CoOkIE", "SeT-CoOkIE", "sET-CoOkIE", "SET-CoOkIE", "set-cOOkIE", "Set-cOOkIE", "sEt-cOOkIE", "SEt-cOOkIE", "seT-cOOkIE", "SeT-cOOkIE", "sET-cOOkIE", "SET-cOOkIE", "set-COOkIE", "Set-COOkIE", "sEt-COOkIE", "SEt-COOkIE", "seT-COOkIE", "SeT-COOkIE", "sET-COOkIE", "SET-COOkIE", "set-cooKIE", "Set-cooKIE", "sEt-cooKIE", "SEt-cooKIE", "seT-cooKIE", "SeT-cooKIE", "sET-cooKIE", "SET-cooKIE", "set-CooKIE", "Set-CooKIE", "sEt-CooKIE", "SEt-CooKIE", "seT-CooKIE", "SeT-CooKIE", "sET-CooKIE", "SET-CooKIE", "set-cOoKIE", "Set-cOoKIE", "sEt-cOoKIE", "SEt-cOoKIE", "seT-cOoKIE", "SeT-cOoKIE", "sET-cOoKIE", "SET-cOoKIE", "set-COoKIE", "Set-COoKIE", "sEt-COoKIE", "SEt-COoKIE", "seT-COoKIE", "SeT-COoKIE", "sET-COoKIE", "SET-COoKIE", "set-coOKIE", "Set-coOKIE", "sEt-coOKIE", "SEt-coOKIE", "seT-coOKIE", "SeT-coOKIE", "sET-coOKIE", "SET-coOKIE", "set-CoOKIE", "Set-CoOKIE", "sEt-CoOKIE", "SEt-CoOKIE", "seT-CoOKIE", "SeT-CoOKIE", "sET-CoOKIE", "SET-CoOKIE", "set-cOOKIE", "Set-cOOKIE", "sEt-cOOKIE", "SEt-cOOKIE", "seT-cOOKIE", "SeT-cOOKIE", "sET-cOOKIE", "SET-cOOKIE", "set-COOKIE", "Set-COOKIE", "sEt-COOKIE", "SEt-COOKIE", "seT-COOKIE", "SeT-COOKIE", "sET-COOKIE", "SET-COOKIE"] };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/sanitize-headers.js
var require_sanitize_headers2 = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/sanitize-headers.js"(exports, module) {
    "use strict";
    var setCookieVariations = require_set_cookie().variations;
    module.exports = function sanitizeHeaders(headers) {
      return Object.keys(headers).reduce((memo, key) => {
        const value = headers[key];
        if (Array.isArray(value)) {
          if (key.toLowerCase() === "set-cookie") {
            value.forEach((cookie, i) => {
              memo[setCookieVariations[i]] = cookie;
            });
          } else {
            memo[key] = value.join(", ");
          }
        } else {
          memo[key] = value == null ? "" : value.toString();
        }
        return memo;
      }, {});
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/format-response.js
var require_format_response2 = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/format-response.js"(exports, module) {
    var isBinary = require_is_binary2();
    var Response = require_response();
    var sanitizeHeaders = require_sanitize_headers2();
    module.exports = (response, options) => {
      const { statusCode } = response;
      const headers = sanitizeHeaders(Response.headers(response));
      if (headers["transfer-encoding"] === "chunked" || response.chunkedEncoding) {
        throw new Error("chunked encoding not supported");
      }
      const isBase64Encoded = isBinary(headers, options);
      const encoding = isBase64Encoded ? "base64" : "utf8";
      const body = Response.body(response).toString(encoding);
      return { status: statusCode, headers, isBase64Encoded, body };
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/index.js
var require_azure = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/azure/index.js"(exports, module) {
    var cleanupRequest = require_clean_up_request();
    var createRequest = require_create_request2();
    var formatResponse = require_format_response2();
    module.exports = (options) => {
      return (getResponse) => async (context, req) => {
        const event = cleanupRequest(req, options);
        const request = createRequest(event, options);
        const response = await getResponse(request, context, event);
        context.log(response);
        return formatResponse(response, options);
      };
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/get-provider.js
var require_get_provider = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/lib/provider/get-provider.js"(exports, module) {
    var aws = require_aws();
    var azure = require_azure();
    var providers = {
      aws,
      azure
    };
    module.exports = function getProvider(options) {
      const { provider = "aws" } = options;
      if (provider in providers) {
        return providers[provider](options);
      }
      throw new Error(`Unsupported provider ${provider}`);
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/serverless-http.js
var require_serverless_http = __commonJS({
  "../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/serverless-http/serverless-http.js"(exports, module) {
    "use strict";
    var finish = require_finish();
    var getFramework = require_get_framework();
    var getProvider = require_get_provider();
    var defaultOptions = {
      requestId: "x-request-id"
    };
    module.exports = function(app, opts) {
      const options = Object.assign({}, defaultOptions, opts);
      const framework = getFramework(app);
      const provider = getProvider(options);
      return provider(async (request, ...context) => {
        await finish(request, options.request, ...context);
        const response = await framework(request);
        await finish(response, options.response, ...context);
        return response;
      });
    };
  }
});

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/open-next/dist/adapters/server-adapter.js
var import_serverless_http = __toESM(require_serverless_http(), 1);
import fs2 from "node:fs";
import path2 from "node:path";
import NextServer from "next/dist/server/next-server.js";

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/open-next/dist/adapters/util.js
import fs from "node:fs";
import path from "node:path";
function loadConfig(nextDir2) {
  const filePath = path.join(nextDir2, "required-server-files.json");
  const json = fs.readFileSync(filePath, "utf-8");
  const { config: config2 } = JSON.parse(json);
  return config2;
}

// ../../../../../../../.npm/_npx/a94ce00fc9d9ef90/node_modules/open-next/dist/adapters/server-adapter.js
setNextjsServerWorkingDirectory();
var nextDir = path2.join(__dirname, ".next");
var config = loadConfig(nextDir);
var htmlPages = loadHtmlPages();
console.log({ nextDir });
var requestHandler = new NextServer.default({
  conf: { ...config, compress: false },
  customServer: false,
  dev: false,
  dir: __dirname,
  minimalMode: true
}).getRequestHandler();
var server = (0, import_serverless_http.default)(async (req, res) => {
  await requestHandler(req, res).catch((e) => {
    console.error("NextJS request failed.");
    console.error(e);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      message: "Server failed to respond.",
      details: e
    }, null, 2));
  });
}, {
  binary: true,
  provider: "aws",
  request: (request) => {
    delete request.body;
  }
});
async function handler(event, context) {
  console.log(event);
  const middlewareRequestHeaders = JSON.parse(event.headers["x-op-middleware-request-headers"] || "{}");
  event.headers = { ...event.headers, ...middlewareRequestHeaders };
  const response = await server(event, context);
  if (htmlPages.includes(event.rawPath) && !response.headers?.["cache-control"]) {
    response.headers["cache-control"] = "public, max-age=0, s-maxage=31536000, must-revalidate";
  }
  const middlewareResponseHeaders = JSON.parse(event.headers["x-op-middleware-response-headers"] || "{}");
  response.headers = { ...response.headers, ...middlewareResponseHeaders };
  console.log("response headers", response.headers);
  return response;
}
function setNextjsServerWorkingDirectory() {
  process.chdir(__dirname);
}
function loadHtmlPages() {
  const filePath = path2.join(nextDir, "server", "pages-manifest.json");
  const json = fs2.readFileSync(filePath, "utf-8");
  return Object.entries(JSON.parse(json)).filter(([_, value]) => value.endsWith(".html")).map(([key]) => key);
}
export {
  handler
};
