"use strict";

module.exports = (buildDir) => ({
  output: `${buildDir}/cdk.out`,
  app: `node ${buildDir}/run.js`,
});
