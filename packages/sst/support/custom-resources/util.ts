/* eslint-disable no-console */
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";
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

export const sdkLogger = {
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: () => {},
  trace: () => {},
};

export function useAWSClient<C extends any>(client: new (config: any) => C) {
  const result = new client({
    logger: sdkLogger,
    retryStrategy: new StandardRetryStrategy(async () => 10000, {
      retryDecider: (e: any) => {
        // Handle throttling errors => retry
        if (
          [
            "ThrottlingException",
            "Throttling",
            "TooManyRequestsException",
            "OperationAbortedException",
            "TimeoutError",
            "NetworkingError",
          ].includes(e.name)
        ) {
          console.debug("Retry AWS call", e.name, e.message);
          return true;
        }

        return false;
      },
      delayDecider: (_, attempts) => {
        return Math.min(1.5 ** attempts * 100, 5000);
      },
      // AWS SDK v3 has an idea of "retry tokens" which are used to
      // prevent multiple retries from happening at the same time.
      // This is a workaround to disable that.
      retryQuota: {
        hasRetryTokens: () => true,
        releaseRetryTokens: () => {},
        retrieveRetryTokens: () => 1,
      },
    }),
  });
  return result;
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
