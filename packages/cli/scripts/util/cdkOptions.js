"use strict";

module.exports = (config) => ({
  output: `${config.buildDir}/cdk.out`,
  app: `node ${config.buildDir}/run.js`,
});
