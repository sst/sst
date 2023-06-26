import { EventBridgeEvent } from "aws-lambda";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";

const logger = { ...console, trace: () => {}, debug: () => {} };
const s3 = new S3Client({ logger });
const iot = new IoTDataPlaneClient({ logger });
const cf = new CloudFormationClient({ logger });
const BUCKET_NAME = process.env.BUCKET_NAME!;

export async function handler(event: EventBridgeEvent<any, any>) {
  console.log("EventBridge event details:", {
    source: event.source,
    detailType: event["detail-type"],
  });

  // Validate event source
  if (
    event.source !== "aws.cloudformation" ||
    event["detail-type"] !== "CloudFormation Stack Status Change"
  ) {
    return;
  }

  // Validate stack status is *_COMPLETE
  const stackStatus = event.detail["status-details"]?.status;
  if (!stackStatus.endsWith("_COMPLETE")) {
    return;
  }

  // Get metadata
  const stack = event.detail["stack-id"];
  console.log("Stack id:", stack);
  const res = await getMetadata(stack);
  if (!res) {
    console.log("Stack metadata resource not found");
    return;
  }

  // Update metadata
  const { app, stage, metadata } = res;
  const stackName = stack.split("/")[1];
  if (stackStatus === "DELETE_COMPLETE") {
    await deleteMetadata(stackName, app, stage);
    await sendIotEvent(app, stage, `stacks.metadata.deleted`);
  } else {
    await saveMetadata(stackName, app, stage, metadata);
    await sendIotEvent(app, stage, `stacks.metadata.updated`);
  }
}

async function sendIotEvent(app: string, stage: string, type: string) {
  await callAWS(() =>
    iot.send(
      new PublishCommand({
        topic: `/sst/${app}/${stage}/events`,
        payload: Buffer.from(JSON.stringify({ type })),
      })
    )
  );
}

async function saveMetadata(
  stack: string,
  app: string,
  stage: string,
  metadata: any[]
) {
  await callAWS(() =>
    s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `stackMetadata/app.${app}/stage.${stage}/stack.${stack}.json`,
        Body: JSON.stringify(metadata),
      })
    )
  );
}

async function deleteMetadata(stackName: string, app: string, stage: string) {
  try {
    await callAWS(() =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `stackMetadata/app.${app}/stage.${stage}/stack.${stackName}.json`,
        })
      )
    );
  } catch (e: any) {
    if (e.code === "NoSuchBucket") {
      console.log(e);
      return;
    }
    throw e;
  }
}

async function getMetadata(stackName: string) {
  const ret = await callAWS(() =>
    cf.send(
      new DescribeStacksCommand({
        StackName: stackName,
      })
    )
  );
  const metadataOutput = ret.Stacks?.at(0)?.Outputs?.find(
    (o: any) => o.OutputKey === "SSTMetadata"
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
    if (
      (e.code === "ThrottlingException" && e.message === "Rate exceeded") ||
      (e.code === "Throttling" && e.message === "Rate exceeded") ||
      (e.code === "TooManyRequestsException" &&
        e.message === "Too Many Requests") ||
      e.code === "TooManyUpdates" ||
      e.code === "OperationAbortedException" ||
      e.code === "TimeoutError" ||
      e.code === "NetworkingError" ||
      e.code === "ResourceConflictException"
    ) {
      return callAWS(cb);
    }
    throw e;
  }
}
