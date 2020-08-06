const yarnInstall = require("./yarn-install");
const runJestCommand = require("./run-jest-command");
const runBuildCommand = require("./run-build-command");
const clearBuildOutput = require("./clear-build-output");
const removeNodeModules = require("./remove-node-modules");

const errorRegex = /(Error|Exception) ---/;
const successRegex = /Successfully synthesized to /;

module.exports = {
  yarnInstall,
  errorRegex,
  successRegex,
  runJestCommand,
  runBuildCommand,
  clearBuildOutput,
  removeNodeModules,
};
