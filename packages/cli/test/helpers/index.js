import yarnInstall from "./yarn-install";

import runCdkCommand from "./run-cdk-command";
import runJestCommand from "./run-jest-command";
import runBuildCommand from "./run-build-command";
import runStartCommand from "./run-start-command";
import runRemoveCommand from "./run-remove-command";
import runAddCdkCommand from "./run-add-cdk-command";

import clearBuildOutput from "./clear-build-output";
import removeNodeModules from "./remove-node-modules";

const errorRegex = /(Error|Exception) ---/;
const successRegex = /Successfully compiled \d+ stacks?/;

module.exports = {
  yarnInstall,
  errorRegex,
  successRegex,

  runCdkCommand,
  runJestCommand,
  runBuildCommand,
  runStartCommand,
  runRemoveCommand,
  runAddCdkCommand,

  clearBuildOutput,
  removeNodeModules,
};
