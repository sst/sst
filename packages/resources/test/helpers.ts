/* eslint-disable @typescript-eslint/no-explicit-any*/
/* eslint-disable @typescript-eslint/ban-ts-comment*/

import * as cdk from "@aws-cdk/core";

export function getStackCfResources(stack: cdk.Stack): any {
  // @ts-ignore
  return stack._toCloudFormation().Resources;
}
