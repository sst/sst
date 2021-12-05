import path from "path";
import { removeSync } from "fs-extra";

async function clearBuildOutput(cwd) {
  removeSync(path.join(cwd, ".build"));
}

module.exports = clearBuildOutput;
