"use strict";

const { diff } = require("./util/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  const stackNames = (argv.stacks || []).map((stackName) => {
    return stackName.startsWith(stackPrefix)
      ? stackName
      : `${stackPrefix}${stackName}`;
  });

  // Run CDK Diff
  await diff(cliInfo.cdkOptions, stackNames);
};
