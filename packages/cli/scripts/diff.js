"use strict";

import { diff } from "./util/cdkHelpers.js";

export default async function (argv, config, cliInfo) {
  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  const stackNames = (argv.stacks || []).map((stackName) => {
    return stackName.startsWith(stackPrefix)
      ? stackName
      : `${stackPrefix}${stackName}`;
  });

  // Run CDK Diff
  await diff(cliInfo.cdkOptions, stackNames);
}
