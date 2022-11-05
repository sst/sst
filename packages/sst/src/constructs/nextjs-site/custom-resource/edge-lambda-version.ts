import { createRequire } from "module";
const require = createRequire(import.meta.url);
const AWS = require("aws-sdk");
AWS.config.logger = console;

import { log } from "./util.js";
import * as cfnResponse from "./cfn-response.js";
const lambda = new AWS.Lambda({ region: "us-east-1" });
const LIVE_ALIAS = "live";

export const handler = cfnResponse.safeHandler(async (
  cfnRequest: AWSLambda.CloudFormationCustomResourceEvent
) => {
  log("onEventHandler", cfnRequest);

  // Process request
  let PhysicalResourceId;
  let Data;
  const functionArn = cfnRequest.ResourceProperties.FunctionArn;
  const functionName = functionArn.split(":").pop();
  switch (cfnRequest.RequestType) {
    case "Create": {
      const ret = await createVersion(functionName);
      const version = ret.Version as string;
      await createAlias(functionName, version);
      PhysicalResourceId = `${functionArn}:${version}`;
      Data = { Version: version };
      break;
    }
    case "Update": {
      PhysicalResourceId = cfnRequest.PhysicalResourceId;
      Data = { Version: cfnRequest.PhysicalResourceId.split(":").pop() };
      break;
    }
    case "Delete": {
      await deleteOldVersions(functionName);
      PhysicalResourceId = cfnRequest.PhysicalResourceId;
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

async function createVersion(functionName: string) {
  log(`createVersion() called with functionName`, functionName);

  const resp = await lambda
    .publishVersion({
      FunctionName: functionName,
    })
    .promise();

  log(`response`, resp);

  return { Version: resp.Version };
}

async function createAlias(functionName: string, version: string) {
  log(
    `createAlias() called with functionName`,
    functionName,
    "version",
    version
  );

  let resp;

  // Update alias
  try {
    log("updateAlias");
    resp = await lambda
      .updateAlias({
        Name: LIVE_ALIAS,
        FunctionName: functionName,
        FunctionVersion: version,
      })
      .promise();

    log("response", resp);
  } catch (e: any) {
    // If alias has not be created, create the alias
    if (
      e.code === "ResourceNotFoundException" &&
      e.message.startsWith("Alias not found")
    ) {
      log("updateAlias");
      resp = await lambda
        .createAlias({
          Name: LIVE_ALIAS,
          FunctionName: functionName,
          FunctionVersion: version,
        })
        .promise();

      log("response", resp);
      return;
    }
    throw e;
  }
}

async function deleteOldVersions(functionName: string) {
  log(`deleteOldVersions() called with functionName`, functionName);

  let resp;
  try {
    // Get LIVE_ALIAS version
    resp = await lambda
      .getAlias({
        FunctionName: functionName,
        Name: LIVE_ALIAS,
      })
      .promise();
    log(`getAlias`, resp);
    const liveVersion = resp.FunctionVersion;

    // Get all versions
    resp = await lambda
      .listVersionsByFunction({
        FunctionName: functionName,
        MaxItems: 50,
      })
      .promise();
    log(`listVersionsByFunction`, resp);
    const versionObjs = resp.Versions || [];

    // Remove non LIVE_ALIAS versions
    for (let i = 0, l = versionObjs.length; i < l; i++) {
      const version = versionObjs[i].Version;
      if (version === liveVersion) {
        log("deleteVersion", version, "skipped");
        continue;
      }

      try {
        log("deleteVersion", version, "do");
        resp = await lambda
          .deleteFunction({
            FunctionName: functionName,
            Qualifier: version,
          })
          .promise();
        log("response", resp);
      } catch (e) {
        // Supress error because a version can fail to remove if still in use.
        log(`deleteVersion error`, e);
      }
    }
  } catch (e) {
    // Supress error because it is fine if a specific version fails to remove.
    // All versions will be removed upon removing the function.
    log(`deleteOldVersions error`, e);
  }
}
