import "solid-start/node/globals";
import manifest from "../../dist/client/route-manifest.json";
import server from "./entry-server";

export async function handler(event) {
  const response = await server({
    request: createRequest(event),
    env: { manifest },
  });

  const headers = {};
  for (const [name, value] of response.headers) {
    headers[name] = value;
  }

  return {
    statusCode: response.status,
    headers: headers,
    body: await response.text(),
  };
}

function createRequest(event) {
  const url = new URL(
    event.rawPath,
    `https://${event.requestContext.domainName}`
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    headers.append(key, value);
  }

  const init = {
    method: event.requestContext.http.method,
    headers,
  };

  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD" && event.body) {
    init.body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString()
      : event.body;
  }

  return new Request(url.href, init);
}
