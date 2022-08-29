import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { AuthKeys } from "./auth-keys.js";
import { log, wrapper } from "./util.js";

const s3 = new S3Client({});

export const handler = wrapper(async (cfnRequest: any) => {
  log("onEventHandler", cfnRequest);

  switch (cfnRequest.ResourceType) {
    case "Custom::StackMetadata":
      await handleStackMetadata(cfnRequest);
      break;
    case "Custom::AuthKeys":
      await AuthKeys(cfnRequest);
      break;
  }
});

async function handleStackMetadata(cfnRequest: any) {
  const {
    App: app,
    Stage: stage,
    Stack: stack,
    Metadata: metadata,
    BootstrapBucketName: bucket,
  } = cfnRequest.ResourceProperties;

  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      await saveMetadata({ bucket, app, stage, stack, metadata });
      break;
    case "Delete":
      await removeMetadata({ bucket, app, stage, stack });
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function saveMetadata(input: {
  bucket: string;
  app: string;
  stage: string;
  stack: string;
  metadata: string;
}) {
  log("saveMetadata()", input);

  const resp = await s3.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: `stackMetadata/app.${input.app}/stage.${input.stage}/stack.${input.stack}.json`,
      Body: JSON.stringify(input.metadata),
    })
  );

  log(`response`, resp);
}

async function removeMetadata(input: {
  bucket: string;
  app: string;
  stage: string;
  stack: string;
}) {
  log("removeMetadata()", input.bucket, input.stack);

  try {
    const resp = await s3.send(
      new DeleteObjectCommand({
        Bucket: input.bucket,
        Key: `stackMetadata/app.${input.app}/stage.${input.stage}/stack.${input.stack}.json`,
      })
    );
    log(`response`, resp);
  } catch (e: any) {
    if (e.code === "NoSuchBucket") {
      log(e);
      return;
    }
    throw e;
  }
}
