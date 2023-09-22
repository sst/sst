import { createProxy } from "../util/index.js";

export interface ServiceResources {}

export const Service =
  /* @__PURE__ */
  createProxy<ServiceResources>("Service");
