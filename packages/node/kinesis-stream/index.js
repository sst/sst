import { createProxy, parseEnvironment } from "../util/index.js";
export const KinesisStream = createProxy("KinesisStream");
Object.assign(KinesisStream, parseEnvironment("KinesisStream", ["streamName"]));
