import { createProxy, parseEnvironment } from "../util";
export const Queue = createProxy("Queue");
Object.assign(Queue, parseEnvironment("Queue", ["queueUrl"]));
