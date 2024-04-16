import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { Router } from "./index";
import { Resource } from "sst";

const client = createTRPCClient<Router>({
  links: [
    httpBatchLink({
      url: Resource.TRPC.url,
    }),
  ],
});

export async function handler() {
  console.log(await client.getSignedUrl.mutate());
  return {};
}
