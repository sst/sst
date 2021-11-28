import * as cdk from "@aws-cdk/core";

// eslint-disable-next-line
export interface ISstConstructInfo {}

export abstract class Construct extends cdk.Construct {
  abstract getConstructInfo(): ISstConstructInfo;
}
