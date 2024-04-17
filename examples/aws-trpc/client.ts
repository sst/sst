import { Resource } from "sst";
import type { Router } from "./index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

const client = createTRPCClient<Router>({
  links: [
    httpBatchLink({
      url: Resource.Trpc.url,
    }),
  ],
});

export async function handler() {
  return {
    statusCode: 200,
    body: await client.greet.query({ name: "Patrick Star" }),
  };
}
