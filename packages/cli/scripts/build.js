"use strict";

const chalk = require("chalk");

const logger = require("./util/logger");
const { synth, cacheCdkContext } = require("./config/cdkHelpers");

function printResults(results, usingYarn) {
  const stacks = results.stacks;
  const l = stacks.length;
  const stacksCopy = l === 1 ? "stack" : "stacks";
  const deployCmd = usingYarn ? "yarn sst deploy" : "npm sst deploy";

  logger.log(
    `\nSuccessfully compiled ${l} ${stacksCopy} to ${chalk.cyan(
      "build/cdk.out"
    )}:\n`
  );

  for (var i = 0; i < l; i++) {
    const stack = stacks[i];
    logger.log(`  ${chalk.cyan(stack.id)}`);
  }

  logger.log(`\nRun ${chalk.cyan(deployCmd)} to deploy to AWS.`);
}

module.exports = async function (argv, config, cliInfo) {
  logger.log(chalk.grey("Synthesizing CDK"));

  const results = await synth();
  printResults(results, cliInfo.yarn);

  // Cache cdk.context.json
  cacheCdkContext();
};
