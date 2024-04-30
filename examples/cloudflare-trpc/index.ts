import { z } from "zod";
import { initTRPC } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

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
      router,
      req: request,
      endpoint: "/",
      createContext: (opts) => opts,
    });
  },
};
