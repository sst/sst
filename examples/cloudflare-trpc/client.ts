import { Resource } from "sst";
import type { Router } from "./index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export default {
  async fetch() {
    const client = createTRPCClient<Router>({
      links: [
        httpBatchLink({
          url: "http://localhost/",
          fetch(req) {
            return Resource.Trpc.fetch(req);
          },
        }),
      ],
    });
    return new Response(
      await client.greet.query({
        name: "Patrick Star",
      }),
    );
  },
};
