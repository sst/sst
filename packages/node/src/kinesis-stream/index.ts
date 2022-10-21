import { createProxy, parseEnvironment } from "../util/index.js";

export interface KinesisStreamResources { }

export const KinesisStream = createProxy<KinesisStreamResources>("KinesisStream");
Object.assign(KinesisStream, parseEnvironment("KinesisStream", ["streamName"]));