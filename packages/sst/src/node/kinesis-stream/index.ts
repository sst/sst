import { createProxy, getVariables } from "../util/index.js";

export interface KinesisStreamResources {}

export const KinesisStream =
  createProxy<KinesisStreamResources>("KinesisStream");
Object.assign(KinesisStream, getVariables("KinesisStream"));
