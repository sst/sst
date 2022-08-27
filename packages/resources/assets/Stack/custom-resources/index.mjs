import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AWS = require("aws-sdk");
AWS.config.logger = console;

import { log, wrapper } from "./util.mjs";
const s3 = new AWS.S3();

export const handler = wrapper(async (cfnRequest) => {
  log("onEventHandler", cfnRequest);

  if (cfnRequest.ResourceType === "Custom::StackMetadata") {
    handleStackMetadata(cfnRequest);
  }
  else if (cfnRequest.ResourceType === "Custom::AuthJWTKeys") {
  }
});

async function handleStackMetadata(cfnRequest) {
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
      await saveMetadata(bucket, app, stage, stack, metadata);
      break;
    case "Delete":
      await removeMetadata(bucket, app, stage, stack);
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function saveMetadata(bucket, app, stage, stack, metadata) {
  log("saveMetadata()", { bucket, app, stage, stack });

  // upload metadata to S3 bucket
  const resp = await s3.putObject({
    Bucket: bucket,
    Key: `stackMetadata/app.${app}/stage.${stage}/stack.${stack}.json`,
    Body: JSON.stringify(metadata),
  }).promise();

  log(`response`, resp);
}

async function removeMetadata(bucket, app, stage, stack) {
  log("removeMetadata()", bucket, stack);

  try {
    const resp = await s3.deleteObject({
      Bucket: bucket,
      Key: `stackMetadata/app.${app}/stage.${stage}/stack.${stack}.json`,
    }).promise();
    log(`response`, resp);
  } catch(e) {
    if (e.code === "NoSuchBucket") {
      log(e);
      return;
    }
    throw e;
  }
}