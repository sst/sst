export * as Replicache from ".";

import { z } from "zod";
import { zod } from "../util/zod";
import { useTransaction } from "../util/transaction";
import { replicache_client } from "./replicache.sql";
import { eq } from "drizzle-orm";

export const fromID = zod(z.string(), (input) =>
  useTransaction(async (tx) => {
    return tx
      .select()
      .from(replicache_client)
      .where(eq(replicache_client.id, input))
      .then((x) => x.at(0));
  })
);

export const create = zod(z.string(), (input) =>
  useTransaction(async (tx) => {
    return tx.insert(replicache_client).values({
      id: input,
      mutationID: 0,
    });
  })
);

export const setMutationID = zod(
  z.object({
    clientID: z.string(),
    mutationID: z.number(),
  }),
  (input) =>
    useTransaction(async (tx) => {
      return tx
        .update(replicache_client)
        .set({
          mutationID: input.mutationID,
        })
        .where(eq(replicache_client.id, input.clientID));
    })
);
