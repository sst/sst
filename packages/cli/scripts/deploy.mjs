"use strict";

import path from "path";
import paths from "./util/paths.mjs";
import {
  synth,
  deploy,
  writeOutputsFile,
  validatePropsForJs,
} from "./util/cdkHelpers.mjs";
import { STACK_DEPLOY_STATUS } from "@serverless-stack/core";

export default async function (argv, config, cliInfo) {
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
}
