import type { SSRManifest } from "astro";
import type { CloudFrontRequestEvent } from "aws-lambda";
import { NodeApp } from "astro/app/node";
import { polyfill } from "@astrojs/webapi";
import { convertFrom, convertTo } from "../lib/event-mapper.js";
import { debug } from "../lib/logger.js";

polyfill(globalThis, {
  exclude: "window document",
});

export function createExports(manifest: SSRManifest) {
  const app = new NodeApp(manifest);

  async function handler(event: CloudFrontRequestEvent) {
    debug("event", event);

    // Parse Lambda event
    const internalEvent = convertFrom(event);

    // Build request
    const requestUrl = internalEvent.url;
    const requestProps = {
      method: internalEvent.method,
      headers: internalEvent.headers,
      body: ["GET", "HEAD"].includes(internalEvent.method)
        ? undefined
        : internalEvent.body,
    };
    debug("request", requestUrl, requestProps);
    const request = new Request(requestUrl, requestProps);

    // Process request
    const response = await app.render(request);
    debug("response", response);

    return await convertTo({
      type: internalEvent.type,
      response,
      cookies: app.setCookieHeaders
        ? (() => {
            const cookies: string[] = [];
            for (const header of app.setCookieHeaders(response)) {
              cookies.push(header);
            }
            return cookies;
          })()
        : undefined,
    });
  }

  return { handler };
}
