import { createProxy, parseEnvironment } from "../util";

export interface KinesisStreamResources { }

export const KinesisStream = createProxy<KinesisStreamResources>("KinesisStream");
Object.assign(KinesisStream, parseEnvironment("KinesisStream", ["streamName"]));