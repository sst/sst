"use strict";

import path from "path";
import chalk from "chalk";
import { logger } from "@serverless-stack/core";
import paths from "./util/paths.mjs";

import {
  synth,
  writeConfig,
  destroyInit,
  destroyPoll,
} from "./util/cdkHelpers.mjs";
import { STACK_DESTROY_STATUS } from "@serverless-stack/core";

export default async function (argv, config, cliInfo) {
  // Skip building functions on remove
  await writeConfig({
    ...config,
    skipBuild: true,
  });

  const { stack, debugStack } = argv;

  // Case 1: --debug-stack is provided
  if (debugStack) {
    await removeDebugStack(config, cliInfo);
    return;
  }
  // Case 2: a stack is provided
  else if (stack) {
    const stackId = stack && buildStackId(config, stack);
    return await removeAppStacks(config, cliInfo, stackId);
  }
  // Case 3: remove all stacks and the debug stack
  else {
    await removeDebugStack(config, cliInfo);
    return await removeAppStacks(config, cliInfo);
  }

  ////////////////
  // Remove app //
  ////////////////
}

async function removeDebugStack(config, cliInfo) {
  logger.info(chalk.grey(`Removing debug stack`));

  // Note: When removing the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));
  try {
    await removeStacks({
      ...cliInfo.cdkOptions,
      app: [
        "node",
        "bin/index.mjs",
        config.name,
        config.stage,
        config.region,
        `"${paths.appPath}"`,
      ].join(" "),
      output: "cdk.out",
    });
  } finally {
    // Note: Restore working directory
    process.chdir(paths.appPath);
  }
}

async function removeAppStacks(config, cliInfo, stackId) {
  logger.info(chalk.grey("Removing " + (stackId ? stackId : "stacks")));

  // Print remove result
  const stackStates = await removeStacks(cliInfo.cdkOptions, stackId);
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

async function removeStacks(cdkOptions, stackId) {
  // Build
  await synth(cdkOptions);

  // Initialize destroy
  let { stackStates, isCompleted } = await destroyInit(cdkOptions, stackId);

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

function buildStackId(config, stack) {
  const stackPrefix = `${config.stage}-${config.name}-`;
  return stack.startsWith(stackPrefix)
    ? stack
    : `${stackPrefix}${stack}`;
}

function formatStackStatus(status) {
  return {
    succeeded: "removed",
    failed: "failed",
    skipped: "not removed",
  }[status];
}
