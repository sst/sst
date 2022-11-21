import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AWS = require("aws-sdk");
AWS.config.logger = console;

import { log } from "./util.js";
import * as cfnResponse from "./cfn-response.js";
const s3 = new AWS.S3({ region: "us-east-1" });

export const handler = cfnResponse.safeHandler(async (
  cfnRequest: AWSLambda.CloudFormationCustomResourceEvent
) => {
  log("onEventHandler", cfnRequest);

  // Get bucket name
  const bucketName =
    cfnRequest.RequestType === "Create"
      ? generateBucketName(cfnRequest.ResourceProperties.BucketNamePrefix)
      : cfnRequest.PhysicalResourceId;

  // Process request
  let responseData;
  switch (cfnRequest.RequestType) {
    case "Create":
      await createBucket(bucketName);
      responseData = {
        BucketName: bucketName,
      };
      break;
    case "Update":
      break;
    case "Delete":
      await emptyBucket(bucketName);
      await deleteBucket(bucketName);
      break;
    default:
      throw new Error("Unsupported request type");
  }

  // Build response
  return cfnResponse.submitResponse("SUCCESS", {
    ...cfnRequest,
    PhysicalResourceId: bucketName,
    Data: responseData,
  });
});

async function createBucket(bucketName: string) {
  log(`createBucket() called with bucketName`, bucketName);

  const resp = await s3
    .createBucket({
      Bucket: bucketName,
    })
    .promise();

  log(`response`, resp);
}

async function deleteBucket(bucketName: string) {
  log(`deleteBucket() called with bucketName`, bucketName);

  const resp = await s3
    .deleteBucket({
      Bucket: bucketName,
    })
    .promise();

  log(`response`, resp);
}

function generateBucketName(prefix: string) {
  const MAX_NAME_LENGTH = 63;
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

////////////////
// @aws-cdk/aws-s3/lib/auto-delete-objectshandler
////////////////
async function emptyBucket(bucketName: string) {
  const listedObjects = await s3
    .listObjectVersions({ Bucket: bucketName })
    .promise();
  const contents = [
    ...(listedObjects.Versions ?? []),
    ...(listedObjects.DeleteMarkers ?? []),
  ];
  if (contents.length === 0) {
    return;
  }

  const records = contents.map((record: any) => ({
    Key: record.Key,
    VersionId: record.VersionId,
  }));
  await s3
    .deleteObjects({ Bucket: bucketName, Delete: { Objects: records } })
    .promise();

  if (listedObjects?.IsTruncated) {
    await emptyBucket(bucketName);
  }
}
