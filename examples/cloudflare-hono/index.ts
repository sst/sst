import { Hono } from "hono";
import { Resource } from "sst";

const app = new Hono()
  .put("/*", async (c) => {
    const key = crypto.randomUUID();
    await Resource.MyBucket.put(key, await c.req.arrayBuffer(), {
      httpMetadata: {
        contentType: c.req.header("content-type"),
      },
    });
    return new Response(`Object created with key: ${key}`);
  })
  .get("/", async (c) => {
    const first = await Resource.MyBucket.list().then(
      (res) =>
        res.objects.sort(
          (a, b) => a.uploaded.getTime() - b.uploaded.getTime(),
        )[0],
    );
    const result = await Resource.MyBucket.get(first.key);
    c.header("content-type", result.httpMetadata.contentType);
    return c.body(result.body as ReadableStream);
  });

export default app;
