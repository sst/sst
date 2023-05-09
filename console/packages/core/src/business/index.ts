export * as Business from "./";

import { createSelectSchema } from "drizzle-zod";
import { business } from "./business.sql";
import { z } from "zod";
import { zod } from "../util/zod";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../drizzle";
import { eq } from "drizzle-orm";
import { useTransaction } from "../util/transaction";
import { Workspace } from "../workspace";

export const Info = createSelectSchema(business, {
  id: (schema) => schema.id.cuid2(),
  name: (schema) => schema.name.nonempty(),
  namespace: (schema) => schema.namespace.nonempty(),
});
export type Info = z.infer<typeof Info>;

export const create = zod(
  Info.pick({ name: true, id: true }).partial({
    id: true,
  }),
  async (input) => {
    const id = input.id ?? createId();
    let namespace = input.name
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s/g, "-");
    return useTransaction(async (tx) => {
      await tx.insert(business).values({
        id,
        name: input.name,
        namespace,
      });
      await Workspace.create({
        slug: "",
        businessID: id,
      });
      return id;
    });
  }
);

export const fromID = zod(Info.shape.id, async (id) =>
  db.transaction(async (tx) => {
    return tx
      .select()
      .from(business)
      .where(eq(business.id, id))
      .execute()
      .then((rows) => rows[0]);
  })
);
