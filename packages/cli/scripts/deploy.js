"use strict";

const path = require("path");
const fs = require("fs-extra");

const paths = require("./util/paths");
const { synth, deploy } = require("./util/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`
  let stackName = argv.stack;
  if (stackName) {
    stackName = stackName.startsWith(stackPrefix)
      ? stackName
      : `${stackPrefix}${stackName}`;
  }

  // Run CDK Synth
  await synth(cliInfo.cdkOptions);

  // Run CDK Deploy
  const stacksData = await deploy(cliInfo.cdkOptions, stackName);

  // This is native CDK option. According to CDK documentation:
  // If an outputs file has been specified, create the file path and write stack outputs to it once.
  // Outputs are written after all stacks have been deployed. If a stack deployment fails,
  // all of the outputs from successfully deployed stacks before the failure will still be written.
  if (argv.outputsFile) {
    await writeOutputsFile(
      stacksData,
      path.join(paths.appPath, argv.outputsFile)
    );
  }

  return stacksData;
};

async function writeOutputsFile(stacksData, outputsFileWithPath) {
  const stackOutputs = stacksData.reduce((acc, { name, outputs }) => {
    if (Object.keys(outputs || {}).length > 0) {
      return { ...acc, [name]: outputs };
    }
    return acc;
  }, {});

  fs.ensureFileSync(outputsFileWithPath);
  await fs.writeJson(outputsFileWithPath, stackOutputs, {
    spaces: 2,
    encoding: "utf8",
  });
}
