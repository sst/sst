import { Input } from "@pulumi/pulumi";

export module Warp {
  export interface Definition {
    functionID: string;
    runtime: string;
    properties: any;
    handler: string;
    bundle?: string;
    links: string[];
    copyFiles?: {
      from: string;
      to?: string;
    }[];
  }
  let warps: Record<string, Input<Definition | undefined>> = {};
  export function reset() {
    warps = {};
  }

  export function list() {
    return warps;
  }

  export function register(
    functionID: string,
    definition: Input<Definition | undefined>,
  ) {
    warps[functionID] = definition;
  }
}
