import * as cdk from "@aws-cdk/core";

export abstract class Construct extends cdk.Construct {
  abstract getConstructInfo(): ISstConstructInfo;
}

export interface ISstConstruct extends cdk.Construct {
  getConstructInfo(): ISstConstructInfo;
}

// eslint-disable-next-line
export interface ISstConstructInfo {}
