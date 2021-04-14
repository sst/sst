"use strict";

const path = require("path");
const chalk = require("chalk");
const { logger } = require("@serverless-stack/core");

const paths = require("./util/paths");
const { synth, destroyInit, destroyPoll } = require("./util/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  // Skip building functions on remove
  const cdkOptions = { ...cliInfo.cdkOptions, context: "sst:build-functions=false" };

  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`
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
    logger.info(chalk.grey(`Removing ${debugStackName} stack`));
    // Note: When removing the debug stack, the current working directory is user's app.
    //       Setting the current working directory to debug stack cdk app directory to allow
    //       Lambda Function construct be able to reference code with relative path.
    process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));
    try {
      await removeApp({
        ...cdkOptions,
        app: `node bin/index.js ${debugStackName} ${config.stage} ${config.region}`,
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

  logger.info(chalk.grey("Removing " + (stackName ? stackName : "stacks")));

  const stackStates = await removeApp(cdkOptions, stackName);

  // Print remove result
  printResults(stackStates);

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
  }));
};

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
