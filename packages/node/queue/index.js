import { createProxy, parseEnvironment } from "../util/index.js";
export const Queue = createProxy("Queue");
Object.assign(Queue, parseEnvironment("Queue", ["queueUrl"]));
