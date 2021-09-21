import * as cfnResponse from "./cfn-response";
import { invokeFunction } from "./outbound";
import { log } from "./util";

export = {
  handler: cfnResponse.safeHandler(handler),
};

async function handler(
  cfnRequest: AWSLambda.CloudFormationCustomResourceEvent
) {
  log("onEventHandler", cfnRequest);

  // Invoke user function on Create and on Update
  const fnName = cfnRequest.ResourceProperties.UserFunction;
  const fnParams = JSON.parse(cfnRequest.ResourceProperties.UserParams);
  if (
    cfnRequest.RequestType === "Create" ||
    cfnRequest.RequestType === "Update"
  ) {
    await invokeUserFunction(fnName, fnParams);
  }

  // Build response
  return cfnResponse.submitResponse("SUCCESS", {
    ...cfnRequest,
    PhysicalResourceId: defaultPhysicalResourceId(cfnRequest),
  });
}

async function invokeUserFunction(functionName: string, payload: any) {
  log(`executing user function ${functionName} with payload`, payload);

  const resp = await invokeFunction({
    FunctionName: functionName,
    Payload: JSON.stringify(payload),
  });

  log("user function response:", resp, typeof resp);

  if (resp.FunctionError) {
    log("user function threw an error:", resp.FunctionError);

    const jsonPayload = parseJsonPayload(resp.Payload);
    const errorMessage = jsonPayload.errorMessage || "error";

    // append a reference to the log group.
    const message = [
      errorMessage,
      "",
      `Logs: /aws/lambda/${functionName}`, // cloudwatch log group
      "",
    ].join("\n");

    const e = new Error(message);

    // the output that goes to CFN is what's in `stack`, not the error message.
    // if we have a remote trace, construct a nice message with log group information
    if (jsonPayload.trace) {
      // skip first trace line because it's the message
      e.stack = [message, ...jsonPayload.trace.slice(1)].join("\n");
    }

    throw e;
  }
}

function parseJsonPayload(payload: any): any {
  if (!payload) {
    return {};
  }
  const text = payload.toString();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `return values from user-handlers must be JSON objects. got: "${text}"`
    );
  }
}

function defaultPhysicalResourceId(
  req: AWSLambda.CloudFormationCustomResourceEvent
): string {
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
