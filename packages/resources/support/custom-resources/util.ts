/* eslint-disable no-console */
import * as cfnResponse from "./cfn-response.js";

export function wrapper(block: (event: any) => Promise<void>) {
  return cfnResponse.safeHandler(
    async (cfnRequest: AWSLambda.CloudFormationCustomResourceEvent) => {
      await block(cfnRequest);

      // Build response
      return cfnResponse.submitResponse("SUCCESS", {
        ...cfnRequest,
        PhysicalResourceId: defaultPhysicalResourceId(cfnRequest),
      });
    }
  );
}

export function log(title: any, ...args: any[]) {
  console.log(
    "[provider-framework]",
    title,
    ...args.map((x) =>
      typeof x === "object" ? JSON.stringify(x, undefined, 2) : x
    )
  );
}

function defaultPhysicalResourceId(
  req: AWSLambda.CloudFormationCustomResourceEvent
) {
  switch (req.RequestType) {
    case "Create":
      return req.RequestId;

    case "Update":
    case "Delete":
      return req.PhysicalResourceId;

    default:
      throw new Error(
        `Invalid "RequestType" in request "${JSON.stringify(req)}"`
      );
  }
}
