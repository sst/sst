const path = require("path");
const { removeSync } = require("fs-extra");

async function clearBuildOutput(...dirs) {
  removeSync(path.join(...dirs));
}

module.exports = clearBuildOutput;
