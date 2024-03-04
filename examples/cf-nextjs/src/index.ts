export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/static") {
      const object = await env.MY_BUCKET.get("index.html");
      if (object === null) {
        return new Response("Object Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      return new Response(object.body, {
        headers,
      });
    }

    const html = `<!DOCTYPE html>
    <body>
      <h1>This root page is rendered by a Cloudflare Worker</h1>
      <p><a href="/static">/static is a static html page in an R2 bucket, fetched and then rendered by the server worker.</p>
    </body>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
};
