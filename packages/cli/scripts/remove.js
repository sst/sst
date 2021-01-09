"use strict";

const path = require("path");
const chalk = require("chalk");
const { logger } = require("logger");
const { parallelDestroy } = require("@serverless-stack/core");

const paths = require("./util/paths");
const { destroy: cdkDestroy } = require("./util/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  const stackName = `${config.stage}-debug-stack`;

  ////////////////////////
  // Remove debug stack //
  ////////////////////////
  logger.info(chalk.grey("Removing " + stackName + " stack"));
  const debugAppArgs = [stackName, config.stage, config.region];
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));
  await cdkDestroy({
    ...cliInfo.cdkOptions,
    app: `node bin/index.js ${debugAppArgs.join(" ")}`,
    output: "cdk.out",
  });
  // Note: Restore working directory
  process.chdir(paths.appPath);

  ////////////////
  // Remove app //
  ////////////////
  logger.info(chalk.grey("Removing " + (argv.stack ? argv.stack : "stacks")));

  // Wait for remove to complete
  let stackStates;
  let isCompleted;
  do {
    // Update remove status
    const cdkOptions = { ...cliInfo.cdkOptions, stackName: argv.stack };
    const response = await parallelDestroy(cdkOptions, stackStates);
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!isCompleted) {
      logger.info("Checking remove status...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  // Print remove result
  stackStates.forEach(({ name, status, errorMessage }) => {
    logger.info(`\nStack ${name}`);
    logger.info(`  Status: ${formatStackStatus(status)}`);
    if (errorMessage) {
      logger.info(`  Error: ${errorMessage}`);
    }
  });
  logger.info("");

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
  }));
};

function formatStackStatus(status) {
  return {
    succeeded: "removed",
    failed: "failed",
    skipped: "not removed",
  }[status];
}
