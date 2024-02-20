import { Input, output } from "@pulumi/pulumi";

export module Metadata {
  let all: Record<string, any> = {};
  export function register(urn: Input<string>, metadata: any) {
    output(urn).apply((urn) => {
      all[urn] = metadata;
    });
  }

  export function list() {
    return all;
  }
}
