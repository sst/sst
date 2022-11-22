import { createProxy, parseEnvironment } from "../util/index.js";

export interface QueueResources { }

export const Queue = createProxy<QueueResources>("Queue");
Object.assign(Queue, parseEnvironment("Queue", ["queueUrl"]));