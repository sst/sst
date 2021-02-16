const path = require("path");
const { removeSync } = require("fs-extra");

async function clearBuildOutput(cwd) {
  removeSync(path.join(cwd, ".build"));
}

module.exports = clearBuildOutput;
