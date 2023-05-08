import { createProxy } from "../util/index.js";

export interface KinesisStreamResources {}

export const KinesisStream =
  /* @__PURE__ */ createProxy<KinesisStreamResources>("KinesisStream");
