import { createProxy } from "../util/index.js";

export interface FunctionResources {}

export const Function =
  /* @__PURE__ */ createProxy<FunctionResources>("Function");
