"use strict";

const chalk = require("chalk");
const { parallelDestroy } = require("@serverless-stack/core");

const logger = require("./util/logger");

module.exports = async function (argv, config, cliInfo) {
  logger.log(chalk.grey("Removing " + (argv.stack ? argv.stack : "stacks")));

  // Wait for remove to complete
  let stackStates;
  let isCompleted;
  do {
    // Update remove status
    const cdkOptions = { ...cliInfo.cdkOptions, stackName: argv.stack };
    const response = await parallelDestroy(
      cdkOptions,
      config.region,
      stackStates
    );
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!isCompleted) {
      logger.log("Checking remove status...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  // Print remove result
  stackStates.forEach(({ name, status, errorMessage }) => {
    logger.log(`\nStack ${name}`);
    logger.log(`  Status: ${formatStackStatus(status)}`);
    if (errorMessage) {
      logger.log(`  Error: ${errorMessage}`);
    }
  });
  logger.log("");

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
