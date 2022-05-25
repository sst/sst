"use strict";

import { diff } from "./util/cdkHelpers.mjs";

export default async function (argv, config, cliInfo) {
  // Normalize stack name
  const stackPrefix = `${config.stage}-${config.name}-`;
  const stackIds = (argv.stacks || []).map((stackId) => {
    return stackId.startsWith(stackPrefix)
      ? stackId
      : `${stackPrefix}${stackId}`;
  });

  // Run CDK Diff
  await diff(cliInfo.cdkOptions, stackIds);
}
