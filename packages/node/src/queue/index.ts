import { createProxy, parseEnvironment } from "../util";

export interface QueueResources { }

export const Queue = createProxy<QueueResources>("Queue");
Object.assign(Queue, parseEnvironment("Queue", ["queueUrl"]));