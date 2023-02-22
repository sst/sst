import { createProxy, getVariables } from "../util/index.js";

export interface QueueResources {}

export const Queue = createProxy<QueueResources>("Queue");
Object.assign(Queue, await getVariables("Queue"));
