import path from "path";
import { removeSync } from "fs-extra";

async function removeNodeModules(cwd) {
  removeSync(path.join(cwd, "node_modules"));
}

module.exports = removeNodeModules;
