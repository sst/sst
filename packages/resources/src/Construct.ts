import * as cdk from "@aws-cdk/core";

export interface ISstConstructInfo {
  stack: string;
}

export interface ISstConstruct {
  getConstructInfo(): ISstConstructInfo[];
}

export function isSstConstruct(input: any): input is ISstConstruct {
  return "getConstructInfo" in input;
}
