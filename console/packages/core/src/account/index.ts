export * as Account from "./";

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { eq } from "drizzle-orm";
import { useTransaction } from "../util/transaction";
import { account } from "./account.sql";

export const Info = createSelectSchema(account, {
  id: (schema) => schema.id.cuid2(),
  email: (schema) => schema.email.email(),
});
export type Info = z.infer<typeof Info>;

export const create = zod(
  Info.pick({ email: true, id: true }).partial({
    id: true,
  }),
  async (input) => {
    const id = input.id ?? createId();
    return useTransaction(async (tx) => {
      await tx.insert(account).values({
        id,
        email: input.email,
      });
      return id;
    });
  }
);

export const fromID = zod(Info.shape.id, async (id) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(account)
      .where(eq(account.id, id))
      .execute()
      .then((rows) => rows[0]);
  })
);

export const fromEmail = zod(Info.shape.email, async (email) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(account)
      .where(eq(account.email, email))
      .execute()
      .then((rows) => rows[0]);
  })
);
