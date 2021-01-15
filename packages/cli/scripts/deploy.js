"use strict";

const path = require("path");
const chalk = require("chalk");
const { logger } = require("@serverless-stack/core");

const paths = require("./util/paths");
const { synth, parallelDeploy } = require("./util/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  logger.info(chalk.grey("Deploying " + (argv.stack ? argv.stack : "stacks")));

  // Build
  await synth(cliInfo.cdkOptions);

  // Loop until deployment is complete
  let stackStates;
  let isCompleted;
  do {
    // Get CFN events before update
    const prevEventCount = stackStates ? getEventCount(stackStates) : 0;

    // Update deploy status
    const response = await parallelDeploy({
      ...cliInfo.cdkOptions,
      stackName: argv.stack,
      cdkOutputPath: path.join(paths.appPath, paths.appBuildDir, "cdk.out"),
    }, stackStates);
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!response.isCompleted) {
      // Get CFN events after update. If events count did not change, we need to print out a
      // message to let users know we are still checking.
      const currEventCount = getEventCount(stackStates);
      if (currEventCount === prevEventCount) {
        logger.info("Checking deploy status...");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  // Print deploy result
  printResults(stackStates);

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
    outputs: stackState.outputs,
  }));
};

function getEventCount(stackStates) {
  return stackStates.reduce(
    (acc, stackState) => acc + (stackState.events || []).length,
    0
  );
}

function printResults(stackStates) {
  stackStates.forEach(({ name, status, errorMessage, outputs, exports }) => {
    logger.info(`\nStack ${name}`);
    logger.info(`  Status: ${formatStackStatus(status)}`);
    if (errorMessage) {
      logger.info(`  Error: ${errorMessage}`);
    }

    if (Object.keys(outputs || {}).length > 0) {
      logger.info("  Outputs:");
      Object.keys(outputs).forEach((name) =>
        logger.info(`    ${name}: ${outputs[name]}`)
      );
    }

    if (Object.keys(exports || {}).length > 0) {
      logger.info("  Exports:");
      Object.keys(exports).forEach((name) =>
        logger.info(`    ${name}: ${exports[name]}`)
      );
    }
  });
  logger.info("");
}

function formatStackStatus(status) {
  return {
    failed: "failed",
    succeeded: "deployed",
    unchanged: "no changes",
    skipped: "not deployed",
  }[status];
}
