import { createProxy } from "../util/index.js";

export interface BucketResources {}

export const Bucket = /* @__PURE__ */ createProxy<BucketResources>("Bucket");
