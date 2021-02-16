const path = require("path");
const { removeSync } = require("fs-extra");

async function removeNodeModules(cwd) {
  removeSync(path.join(cwd, "node_modules"));
}

module.exports = removeNodeModules;
