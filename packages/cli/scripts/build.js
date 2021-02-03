"use strict";

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const { logger } = require("@serverless-stack/core");

const paths = require("./util/paths");
const { synth } = require("./util/cdkHelpers");

function printResults(results, usingYarn) {
  const stacks = results.stacks;
  const l = stacks.length;
  const stacksCopy = l === 1 ? "stack" : "stacks";
  const deployCmd = usingYarn ? "yarn sst deploy" : "npx sst deploy";

  logger.info(
    `\nSuccessfully compiled ${l} ${stacksCopy} to ${chalk.cyan(
      ".build/cdk.out"
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

  // Run CDK synth
  await synth(cliInfo.cdkOptions);

  // Parse generated CDK stacks
  try {
    const manifestPath = path.join(
      paths.appPath,
      cliInfo.cdkOptions.output,
      "manifest.json"
    );
    const manifest = await fs.readJson(manifestPath);
    const stacks = Object.keys(manifest.artifacts)
      .filter(
        (key) => manifest.artifacts[key].type === "aws:cloudformation:stack"
      )
      .map((key) => ({
        id: key,
        name: key,
        dependencies: manifest.artifacts[key].dependencies,
      }));
    const results = { stacks };
    printResults(results, cliInfo.yarn);
  } catch (e) {
    logger.error("Failed to parse generated manifest.json", e);
  }
};
