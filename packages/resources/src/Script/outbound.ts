/* istanbul ignore file */
import * as https from "https";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AWS = require("aws-sdk");
import type { StepFunctions, Lambda } from "aws-sdk";
import type { ConfigurationOptions } from "aws-sdk/lib/config-base";

const FRAMEWORK_HANDLER_TIMEOUT = 900000; // 15 minutes

// In order to honor the overall maximum timeout set for the target process,
// the default 2 minutes from AWS SDK has to be overriden:
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#httpOptions-property
const awsSdkConfig: ConfigurationOptions = {
  httpOptions: { timeout: FRAMEWORK_HANDLER_TIMEOUT },
};

async function defaultHttpRequest(
  options: https.RequestOptions,
  responseBody: string
) {
  return new Promise((resolve, reject) => {
    try {
      const request = https.request(options, resolve);
      request.on("error", reject);
      request.write(responseBody);
      request.end();
    } catch (e) {
      reject(e);
    }
  });
}

let sfn: StepFunctions;
let lambda: Lambda;

async function defaultStartExecution(
  req: StepFunctions.StartExecutionInput
): Promise<StepFunctions.StartExecutionOutput> {
  if (!sfn) {
    sfn = new AWS.StepFunctions(awsSdkConfig);
  }

  return sfn.startExecution(req).promise();
}

async function defaultInvokeFunction(
  req: Lambda.InvocationRequest
): Promise<Lambda.InvocationResponse> {
  if (!lambda) {
    lambda = new AWS.Lambda(awsSdkConfig);
  }

  return lambda.invoke(req).promise();
}

export const startExecution = defaultStartExecution;
export const invokeFunction = defaultInvokeFunction;
export const httpRequest = defaultHttpRequest;
