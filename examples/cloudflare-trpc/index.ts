import { z } from "zod";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";

const t = initTRPC.context().create();

const router = t.router({
  greet: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return `Hello ${input.name}!`;
    }),
});

export type Router = typeof router;

export default {
  async fetch(request: Request): Promise<Response> {
    return fetchRequestHandler({
      req: request,
      endpoint: "/",
      router,
      createContext: (opts) => opts,
    });
  },
};
