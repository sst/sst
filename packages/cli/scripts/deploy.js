"use strict";

const chalk = require("chalk");
const { parallelDeploy } = require("./config/cdkHelpers");

const logger = require("./util/logger");

module.exports = async function (argv, config, cliInfo) {
  logger.log(chalk.grey("Deploying " + (argv.stack ? argv.stack : "stacks")));

  // Wait for deploy to complete
  let stackStates;
  let isCompleted;
  do {
    // Get CFN events before update
    const prevEventCount = stackStates ? getEventCount(stackStates) : 0;

    // Update deploy status
    const cdkOptions = { ...cliInfo.cdkOptions, stackName: argv.stack };
    const response = await parallelDeploy(cdkOptions, stackStates);
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!response.isCompleted) {
      // Get CFN events after update. If events count did not change, we need to print out a
      // message to let users know we are still checking.
      const currEventCount = getEventCount(stackStates);
      if (currEventCount === prevEventCount) {
        logger.log("Checking deploy status...");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  // Print deploy result
  stackStates.forEach(({ name, status, errorMessage, outputs, exports }) => {
    logger.log(`\nStack ${name}`);
    logger.log(`  Status: ${formatStackStatus(status)}`);
    if (errorMessage) {
      logger.log(`  Error: ${errorMessage}`);
    }

    if (Object.keys(outputs || {}).length > 0) {
      logger.log("  Outputs:");
      Object.keys(outputs).forEach((name) =>
        logger.log(`    ${name}: ${outputs[name]}`)
      );
    }

    if (Object.keys(exports || {}).length > 0) {
      logger.log("  Exports:");
      Object.keys(exports).forEach((name) =>
        logger.log(`    ${name}: ${exports[name]}`)
      );
    }
  });
  logger.log("");

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
  }));
};

function getEventCount(stackStates) {
  return stackStates.reduce(
    (acc, stackState) => acc + (stackState.events || []).length,
    0
  );
}

function formatStackStatus(status) {
  return {
    succeeded: "deployed",
    unchanged: "no changes",
    failed: "failed",
    skipped: "not deployed",
  }[status];
}
