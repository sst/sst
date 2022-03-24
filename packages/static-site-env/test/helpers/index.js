const runStartCommand = require("./run-start-command");
const clearBuildOutput = require("./clear-build-output");

function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

module.exports = {
  runStartCommand,
  clearBuildOutput,
  sleep,
};
