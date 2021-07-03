import * as cdk from "@aws-cdk/core";

export interface ISstConstruct extends cdk.Construct {
  /**
   * Called by `lambda.addEventSource` to allow the event source to bind to this
   * function.
   *
   * @param target That lambda function to bind to.
   */
  getConstructInfo(): ISstConstructInfo;
}

// eslint-disable-next-line
export interface ISstConstructInfo {}
