import { createProxy } from "../util/index.js";

export interface TableResources {}

export const Table =
  /* @__PURE__ */
  createProxy<TableResources>("Table");
