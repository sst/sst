"use strict";

const path = require("path");
const chalk = require("chalk");
const { logger } = require("@serverless-stack/core");

const paths = require("./util/paths");
const {
  synth,
  writeConfig,
  destroyInit,
  destroyPoll,
} = require("./util/cdkHelpers");
const { STACK_DESTROY_STATUS } = require("@serverless-stack/core");

module.exports = async function (argv, config, cliInfo) {
  // Skip building functions on remove
  await writeConfig({
    ...config,
    skipBuild: true,
  });

  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  let stackId = argv.stack;
  if (stackId) {
    stackId = stackId.startsWith(stackPrefix)
      ? stackId
      : `${stackPrefix}${stackId}`;
  }

  ////////////////////////
  // Remove debug stack //
  ////////////////////////

  if (!stackId) {
    logger.info(chalk.grey(`Removing debug stack`));
    // Note: When removing the debug stack, the current working directory is user's app.
    //       Setting the current working directory to debug stack cdk app directory to allow
    //       Lambda Function construct be able to reference code with relative path.
    process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));
    try {
      const appBuildLibPath = path.join(paths.appBuildPath, "lib");
      await removeApp({
        ...cliInfo.cdkOptions,
        app: `node bin/index.js ${config.name} ${config.stage} ${config.region} ${appBuildLibPath}`,
        output: "cdk.out",
      });
    } finally {
      // Note: Restore working directory
      process.chdir(paths.appPath);
    }
  }

  ////////////////
  // Remove app //
  ////////////////

  logger.info(chalk.grey("Removing " + (stackId ? stackId : "stacks")));

  const stackStates = await removeApp(cliInfo.cdkOptions, stackId);

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
};

async function removeApp(cdkOptions, stackId) {
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

function formatStackStatus(status) {
  return {
    succeeded: "removed",
    failed: "failed",
    skipped: "not removed",
  }[status];
}
