import { createProxy } from "../util/index.js";

export interface RDSResources {}

export const RDS = /* @__PURE__ */ createProxy<RDSResources>("RDS");
