// src/worker.ts
import { Resource } from "sst";

export default {
  async fetch(): Promise<Response> {
    const first = await Resource.MyBucket.list().then((res) => res.objects[0]);
    const result = await Resource.MyBucket.get(first.key);

    return new Response(result.body, {
      headers: {
        "content-type": result.httpMetadata.contentType,
      },
    });
  },
};
