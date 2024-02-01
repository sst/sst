import { createProxy } from "../util/index.js";
import { Handler } from "../../context/handler.js";

export interface TableResources {}

export const Table =
  /* @__PURE__ */
  createProxy<TableResources>("Table");

export function TableHandler(cb: Parameters<typeof Handler<"ddb">>[1]) {
  return Handler("ddb", async (evt, ctx) => cb(evt, ctx));
}
