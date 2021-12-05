"use strict";

import { join } from "path";
import pkg from "chalk";
const { grey } = pkg;
import { logger } from "@serverless-stack/core";

import { ownPath, appBuildPath, appPath } from "./util/paths.js";
import {
  synth,
  writeConfig,
  destroyInit,
  destroyPoll,
} from "./util/cdkHelpers.js";
import { STACK_DESTROY_STATUS } from "@serverless-stack/core";

export default async function (argv, config, cliInfo) {
  // Skip building functions on remove
  await writeConfig({
    ...config,
    skipBuild: true,
  });

  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  let stackName = argv.stack;
  if (stackName) {
    stackName = stackName.startsWith(stackPrefix)
      ? stackName
      : `${stackPrefix}${stackName}`;
  }

  ////////////////////////
  // Remove debug stack //
  ////////////////////////

  if (!stackName) {
    const debugStackName = `${stackPrefix}debug-stack`;
    logger.info(grey(`Removing ${debugStackName} stack`));
    // Note: When removing the debug stack, the current working directory is user's app.
    //       Setting the current working directory to debug stack cdk app directory to allow
    //       Lambda Function construct be able to reference code with relative path.
    process.chdir(join(ownPath, "assets", "debug-stack"));
    try {
      const appBuildLibPath = join(appBuildPath, "lib");
      await removeApp({
        ...cliInfo.cdkOptions,
        app: `node bin/index.js ${debugStackName} ${config.stage} ${config.region} ${appPath} ${appBuildLibPath}`,
        output: "cdk.out",
      });
    } finally {
      // Note: Restore working directory
      process.chdir(appPath);
    }
  }

  ////////////////
  // Remove app //
  ////////////////

  logger.info(grey("Removing " + (stackName ? stackName : "stacks")));

  const stackStates = await removeApp(cliInfo.cdkOptions, stackName);

  // Print remove result
  printResults(stackStates);

  // Check all stacks deployed successfully
  if (
    stackStates.some(({ status }) => status === STACK_DESTROY_STATUS.FAILED)
  ) {
    throw new Error(`Failed to remove the app`);
  }

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
  }));
}

async function removeApp(cdkOptions, stackName) {
  // Build
  await synth(cdkOptions);

  // Initialize destroy
  let { stackStates, isCompleted } = await destroyInit(cdkOptions, stackName);

  // Loop until remove is complete
  do {
    // Update remove status
    const response = await destroyPoll(cdkOptions, stackStates);
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!isCompleted) {
      logger.info("Checking remove status...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  return stackStates;
}

function printResults(stackStates) {
  stackStates.forEach(({ name, status, errorMessage }) => {
    logger.info(`\nStack ${name}`);
    logger.info(`  Status: ${formatStackStatus(status)}`);
    if (errorMessage) {
      logger.info(`  Error: ${errorMessage}`);
    }
  });
  logger.info("");
}

function formatStackStatus(status) {
  return {
    succeeded: "removed",
    failed: "failed",
    skipped: "not removed",
  }[status];
}
