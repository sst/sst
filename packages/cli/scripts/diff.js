"use strict";

const { diff } = require("./util/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  const stackIds = (argv.stacks || []).map((stackId) => {
    return stackId.includes(`${config.stage}`)&&stackId.includes(`${config.name}`)
      ? stackId
      : `${stackPrefix}${stackId}`;
  });

  // Run CDK Diff
  await diff(cliInfo.cdkOptions, stackIds);
};
