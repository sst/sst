export * as Todo from "./todo";
import { z } from "zod";
import crypto from "crypto";

import { event } from "./event";

export const Events = {
  Created: event("todo.created", {
    id: z.string(),
  }),
};

export async function create() {
  const id = crypto.randomUUID();
  // write to database

  await Events.Created.publish({
    id,
  });
}

export function list() {
  return Array(50)
    .fill(0)
    .map((_, index) => ({
      id: crypto.randomUUID(),
      title: "Todo #" + index,
    }));
}
