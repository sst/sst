import * as cdk from "@aws-cdk/core";

export interface ISstConstructInfo {
  stack: string;
}

export abstract class Construct extends cdk.Construct {
  abstract getConstructInfo(): ISstConstructInfo[];
}
