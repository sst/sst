import { ExtractMetadata } from "./Construct";
import { Queue } from "./Queue";
import { Function as Fn } from "./Function";
import { Api } from "./Api";

export type QueueMetadata = ExtractMetadata<Queue>;
export type FunctionMetadata = ExtractMetadata<Fn>;
export type ApiMetadata = ExtractMetadata<Api>;

export type All = {
  id: string;
  addr: string;
} & (FunctionMetadata | QueueMetadata | ApiMetadata);
