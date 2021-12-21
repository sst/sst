import { Queue } from "./Queue";
import { Function as Fn } from "./Function";
import { Api } from "./Api";
import { Auth } from "./Auth";
import { SSTConstruct } from "./Construct";

type ExtractMetadata<T extends SSTConstruct> = ReturnType<
  T["getConstructMetadata"]
> & { id: string; addr: string; stack: string };

export type QueueMetadata = ExtractMetadata<Queue>;
export type FunctionMetadata = ExtractMetadata<Fn>;
export type ApiMetadata = ExtractMetadata<Api>;
export type AuthMetadata = ExtractMetadata<Auth>;

export type Metadata =
  | FunctionMetadata
  | QueueMetadata
  | ApiMetadata
  | AuthMetadata;
