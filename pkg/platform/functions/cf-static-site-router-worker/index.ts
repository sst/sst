export interface Env {
  BUCKET: any;
  INDEX_PAGE: string;
  ERROR_PAGE?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\//, "");
    const filePath = pathname === "" ? env.INDEX_PAGE : pathname;

    const object = await env.BUCKET.get(filePath);
    if (object) return respond(200, object);

    // Handle error page
    if (env.ERROR_PAGE) {
      const object = await env.BUCKET.get(env.ERROR_PAGE);
      if (object) return respond(404, object);
    } else {
      const object = await env.BUCKET.get(env.INDEX_PAGE);
      if (object) return respond(200, object);
    }

    // Handle failed to render error page
    return new Response("Page Not Found", { status: 404 });
  },
};

function respond(status: number, object: any) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, {
    status,
    headers,
  });
}
