import { createProxy } from "../util/index.js";

export interface TopicResources {}

export const Topic =
  /* @__PURE__ */
  createProxy<TopicResources>("Topic");
