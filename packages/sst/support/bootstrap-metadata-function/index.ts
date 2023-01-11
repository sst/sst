import { SQSEvent, EventBridgeEvent } from "aws-lambda";
import S3 from "aws-sdk/clients/s3";
import CloudFormation from "aws-sdk/clients/cloudformation";
const s3 = new S3({ logger: console });
const cf = new CloudFormation({ logger: console });

export async function handler(event: SQSEvent) {
  console.log("SQS event:", event);

  for (const record of event.Records) {
    await processRecord(JSON.parse(record.body));
  }
}

async function processRecord(record: EventBridgeEvent<any, any>) {
  console.log("EventBridge event details:", { source: record.source, detailType: record["detail-type"] });

  // Validate event source
  if (record.source !== "aws.cloudformation"
    || record["detail-type"] !== "CloudFormation Stack Status Change") {
    return;
  }

  // Validate stack status is *_COMPLETE
  const stackStatus = record.detail["status-details"]?.status;
  if (!stackStatus.endsWith("_COMPLETE")) {
    return;
  }

  // Get metadata
  const stack = record.detail["stack-id"];
  console.log("Stack id:", stack);
  const res = await getMetadata(stack);
  if (!res) {
    console.log("Stack metadata resource not found");
    return;
  }

  // Update metadata
  const { bootstrapBucket: bucket, app, stage, metadata } = res;
  const stackName = stack.split("/")[1];
  if (stackStatus === "DELETE_COMPLETE") {
    await deleteMetadata(stackName, bucket, app, stage);
  }
  else {
    await saveMetadata(stackName, bucket, app, stage, metadata);
  }
}

async function saveMetadata(stack: string, bucket: string, app: string, stage: string, metadata: any[]) {
  try {
    await callAWS(() => s3.putObject({
      Bucket: bucket,
      Key: `stackMetadata/app.${app}/stage.${stage}/stack.${stack}.json`,
      Body: JSON.stringify(metadata),
    }).promise());
  } catch (e: any) {
    throw e;
  }
}

async function deleteMetadata(stackName: string, bucket: string, app: string, stage: string) {
  try {
    await callAWS(() => s3.deleteObject({
      Bucket: bucket,
      Key: `stackMetadata/app.${app}/stage.${stage}/stack.${stackName}.json`,
    }).promise());
  } catch (e: any) {
    if (e.code === "NoSuchBucket") {
      console.log(e);
      return;
    }
    throw e;
  }
}

async function getMetadata(stackName: string) {
  const ret = await callAWS(() => cf.describeStacks({
    StackName: stackName,
  }).promise());
  const metadataOutput = ret.Stacks?.at(0)?.Outputs?.find((o: any) =>
    o.OutputKey === "SstMetadata"
  )?.OutputValue;

  if (!metadataOutput) {
    return null;
  }
  return JSON.parse(metadataOutput);
}

function callAWS<Result extends () => any>(cb: Result): ReturnType<Result> {
  try {
    return cb();
  } catch (e: any) {
    if ((e.code === "ThrottlingException" && e.message === "Rate exceeded") ||
      (e.code === "Throttling" && e.message === "Rate exceeded") ||
      (e.code === "TooManyRequestsException" &&
        e.message === "Too Many Requests") ||
      e.code === "TooManyUpdates" ||
      e.code === "OperationAbortedException" ||
      e.code === "TimeoutError" ||
      e.code === "NetworkingError" ||
      e.code === "ResourceConflictException") {
      return callAWS(cb);
    }
    throw e;
  }
}