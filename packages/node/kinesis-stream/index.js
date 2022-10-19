import { createProxy, parseEnvironment } from "../util";
export const KinesisStream = createProxy("KinesisStream");
Object.assign(KinesisStream, parseEnvironment("KinesisStream", ["streamName"]));
