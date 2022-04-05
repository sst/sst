"use strict";

const path = require("path");
const paths = require("./util/paths");
const { synth, deploy, writeOutputsFile,validatePropsForJs } = require("./util/cdkHelpers");
const { STACK_DEPLOY_STATUS } = require("@serverless-stack/core");

module.exports = async function (argv, config, cliInfo) {
  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  let stackId = argv.stack;
  if (stackId) {
    stackId = stackId.startsWith(stackPrefix)
      ? stackId
      : `${stackPrefix}${stackId}`;
  }

  // Run CDK Synth
  await synth(cliInfo.cdkOptions);
  validatePropsForJs(config);

  // Run CDK Deploy
  const stacksData = await deploy(cliInfo.cdkOptions, stackId);

  // Write outputsFile
  if (argv.outputsFile) {
    await writeOutputsFile(
      stacksData,
      path.resolve(paths.appPath, argv.outputsFile),
      cliInfo.cdkOptions
    );
  }

  // Check all stacks deployed successfully
  if (stacksData.some(({ status }) => status === STACK_DEPLOY_STATUS.FAILED)) {
    throw new Error(`Failed to deploy the app`);
  }

  return stacksData;
};
