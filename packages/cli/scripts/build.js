"use strict";

const chalk = require("chalk");

const { logger } = require("../lib/logger");
const { synth } = require("./util/cdkHelpers");

function printResults(results, usingYarn) {
  const stacks = results.stacks;
  const l = stacks.length;
  const stacksCopy = l === 1 ? "stack" : "stacks";
  const deployCmd = usingYarn ? "yarn sst deploy" : "npx sst deploy";

  logger.info(
    `\nSuccessfully compiled ${l} ${stacksCopy} to ${chalk.cyan(
      "build/cdk.out"
    )}:\n`
  );

  for (var i = 0; i < l; i++) {
    const stack = stacks[i];
    logger.info(`  ${chalk.cyan(stack.id)}`);
  }

  logger.info(`\nRun ${chalk.cyan(deployCmd)} to deploy to AWS.`);
}

module.exports = async function (argv, config, cliInfo) {
  logger.info(chalk.grey("Synthesizing CDK"));

  const results = await synth(cliInfo.cdkOptions);
  printResults(results, cliInfo.yarn);
};
