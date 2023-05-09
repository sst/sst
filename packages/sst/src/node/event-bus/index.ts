import { createProxy } from "../util/index.js";

export interface EventBusResources {}

export const EventBus =
  /* @__PURE__ */ createProxy<EventBusResources>("EventBus");
