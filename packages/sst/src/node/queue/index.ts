import { createProxy } from "../util/index.js";

export interface QueueResources {}

export const Queue = /* @__PURE__ */ createProxy<QueueResources>("Queue");
