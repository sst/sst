declare global {
  const caches: any;
  const AssetManifest: Record<string, string>;
}

export interface Env {
  ASSETS: any;
  INDEX_PAGE: string;
  ERROR_PAGE?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\//, "");
    const filePath = pathname === "" ? env.INDEX_PAGE : pathname;

    // Return from cache if available
    let cachedResponse = await lookupCache();
    if (cachedResponse) return cachedResponse;

    // Fetch from KV
    const object = await env.ASSETS.getWithMetadata(filePath);
    if (object.value) return await respond(200, filePath, object);

    // Handle error page
    if (env.ERROR_PAGE) {
      const object = await env.ASSETS.getWithMetadata(env.ERROR_PAGE);
      if (object.value) return await respond(404, env.ERROR_PAGE, object);
    } else {
      const object = await env.ASSETS.getWithMetadata(env.INDEX_PAGE);
      if (object.value) return await respond(200, env.INDEX_PAGE, object);
    }

    // Handle failed to render error page
    return new Response("Page Not Found", { status: 404 });

    async function lookupCache() {
      const cache = caches.default;
      const hash = AssetManifest[filePath];
      const cacheKey = `${request.url}-${hash}`;
      if (cacheKey) {
        return await cache.match(cacheKey);
      }
    }

    async function setCache(response: Response) {
      const cache = caches.default;
      const hash = AssetManifest[filePath];
      const cacheKey = `${request.url}-${hash}`;
      if (cacheKey) {
        await cache.put(cacheKey, response.clone());
      }
    }

    async function respond(
      status: number,
      fallbackFilepath: string,
      object: any,
    ) {
      // build response
      const headers = new Headers();
      if (AssetManifest[fallbackFilepath]) {
        headers.set("etag", AssetManifest[fallbackFilepath]);
        headers.set("content-type", object.metadata.contentType);
        headers.set("cache-controle", object.metadata.cacheControl);
      }
      const response = new Response(object.value, {
        status,
        headers,
      });

      // set cache
      await setCache(response);

      return response;
    }
  },
};
