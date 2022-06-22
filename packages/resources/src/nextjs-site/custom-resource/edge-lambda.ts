import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AWS = require("aws-sdk");
AWS.config.logger = console;

import { log } from "./util.js";
import * as cfnResponse from "./cfn-response.js";
const s3 = new AWS.S3({ region: "us-east-1" });
const lambda = new AWS.Lambda({ region: "us-east-1" });

export const handler = cfnResponse.safeHandler(async (
  cfnRequest: AWSLambda.CloudFormationCustomResourceEvent
) => {
  log("onEventHandler", cfnRequest);

  // Get bucket name
  const functionName =
    cfnRequest.RequestType === "Create"
      ? generateFunctionName(cfnRequest.ResourceProperties.FunctionNamePrefix)
      : (cfnRequest.PhysicalResourceId.split(":").pop() as string);

  // Process request
  let PhysicalResourceId;
  let Data;
  const bucket = cfnRequest.ResourceProperties.FunctionBucket;
  const params = cfnRequest.ResourceProperties.FunctionParams;
  switch (cfnRequest.RequestType) {
    case "Create": {
      await copyAsset(bucket, params);
      const ret = await createFunction(functionName, params);
      PhysicalResourceId = ret.FunctionArn;
      Data = {
        FunctionArn: ret.FunctionArn,
      };
      break;
    }
    case "Update": {
      const oldParams = cfnRequest.OldResourceProperties.FunctionParams;
      if (isConfigurationChanged(params, oldParams)) {
        await updateFunctionConfiguration(functionName, params);
      }
      if (isCodeChanged(params, oldParams)) {
        await copyAsset(bucket, params);
        await updateFunctionCode(functionName, params);
      }
      PhysicalResourceId = cfnRequest.PhysicalResourceId;
      Data = {
        FunctionArn: cfnRequest.PhysicalResourceId,
      };
      break;
    }
    case "Delete": {
      await deleteFunction(functionName);
      break;
    }
    default:
      throw new Error("Unsupported request type");
  }

  // Build response
  return cfnResponse.submitResponse("SUCCESS", {
    ...cfnRequest,
    PhysicalResourceId,
    Data,
  });
});

function generateFunctionName(prefix: string) {
  const MAX_NAME_LENGTH = 64;
  const length = 20;
  const characters = "abcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  let result = `${prefix
    .toLowerCase()
    .slice(0, MAX_NAME_LENGTH - length - 1)}-`;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function copyAsset(bucket: string, params: any) {
  log(`copyAsset() called with params`, bucket, params);

  // Copy
  log(`copy`);
  const resp = await s3
    .copyObject({
      Bucket: bucket,
      CopySource: `/${params.Code.S3Bucket}/${params.Code.S3Key}`,
      Key: params.Code.S3Key,
    })
    .promise();
  log(`response`, resp);

  // Update params
  params.Code.S3Bucket = bucket;
}

async function createFunction(functionName: string, params: any) {
  log(`createFunction() called with params`, params);

  const resp = await lambda
    .createFunction({
      ...params,
      FunctionName: functionName,
    })
    .promise();

  log(`response`, resp);

  return { FunctionArn: resp.FunctionArn };
}

async function updateFunctionConfiguration(functionName: string, params: any) {
  log(`updateFunctionConfiguration() called with params`, params);

  const resp = await lambda
    .updateFunctionConfiguration({
      ...params,
      Code: undefined,
    })
    .promise();
  log(`response`, resp);
}

async function updateFunctionCode(functionName: string, params: any) {
  log(`updateFunctionCode() called with params`, params);

  const resp = await lambda
    .updateFunctionCode({
      FunctionName: functionName,
      Publish: false,
      ...params.Code,
    })
    .promise();
  log(`response`, resp);
}

async function deleteFunction(functionName: string) {
  log(`deleteFunction() called with functionName`, functionName);

  const resp = await lambda
    .deleteFunction({
      FunctionName: functionName,
    })
    .promise();

  log(`response`, resp);
}

function isConfigurationChanged(params: any, oldParams: any) {
  return (
    Object.keys(params).length !== Object.keys(params).length ||
    ["Description", "Handler", "Runtime", "MemorySize", "Timeout", "Role"].some(
      (p) => params[p] !== oldParams[p]
    )
  );
}

function isCodeChanged(params: any, oldParams: any) {
  return (
    params.Code.S3Bucket !== oldParams.Code.S3Bucket ||
    params.Code.S3Key !== oldParams.Code.S3Key
  );
}
