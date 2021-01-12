const yarnInstall = require("./yarn-install");

const runCdkCommand = require("./run-cdk-command");
const runJestCommand = require("./run-jest-command");
const runBuildCommand = require("./run-build-command");
const runStartCommand = require("./run-start-command");
const runAddCdkCommand = require("./run-add-cdk-command");

const clearBuildOutput = require("./clear-build-output");
const removeNodeModules = require("./remove-node-modules");

const errorRegex = /(Error|Exception) ---/;
const successRegex = /Successfully compiled \d+ stacks/;

module.exports = {
  yarnInstall,
  errorRegex,
  successRegex,

  runCdkCommand,
  runJestCommand,
  runBuildCommand,
  runStartCommand,
  runAddCdkCommand,

  clearBuildOutput,
  removeNodeModules,
};
