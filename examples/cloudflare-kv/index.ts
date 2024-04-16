import { Resource } from "sst";

export default {
  async fetch(req: Request) {
    // curl -X POST -d "some-value" https://cloudflare-kv-jayair-workerscript.sst-15d.workers.dev
    if (req.method == "POST") {
      const key = crypto.randomUUID();
      const body = await req.text();
      await Resource.MyStorage.put(key, body);
      return new Response(key);
    }

    // curl https://cloudflare-kv-jayair-workerscript.sst-15d.workers.dev/e4e134d7-bb75-41a6-9189-16be810c2d81
    if (req.method == "GET") {
      const id = new URL(req.url).pathname.split("/").pop();
      const result = await Resource.MyStorage.get(id);
      return new Response(result);
    }
  },
};

