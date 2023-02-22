import { createProxy, getVariables } from "../util/index.js";

export interface BucketResources {}

export const Bucket = createProxy<BucketResources>("Bucket");
Object.assign(Bucket, getVariables("Bucket"));
