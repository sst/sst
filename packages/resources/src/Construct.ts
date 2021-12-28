import { Function as Fn } from "@aws-cdk/aws-lambda";
import { Stack } from "./Stack";

export interface SSTConstructMetadata<
  T extends string = string,
  D extends Record<string, any> = Record<string, any>
> {
  type: T;
  data: D;
}

export interface SSTConstruct {
  getConstructMetadata(): SSTConstructMetadata;
}

export function isSSTConstruct(input: any): input is SSTConstruct {
  return "getConstructMetadata" in input;
}

export function getFunctionRef(fn?: any) {
  if (!fn) return undefined;
  if (!(fn instanceof Fn)) return undefined;
  return {
    node: fn.node.addr,
    stack: Stack.of(fn).node.id,
  };
}
