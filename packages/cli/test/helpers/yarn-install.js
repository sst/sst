const { promisify } = require("util");
const { exec } = require("child_process");
const { exists } = require("fs");
const removeNodeModules = require("./remove-node-modules");

const execPromise = promisify(exec);
const existsPromise = promisify(exists);
const TIMEOUT = 30000;

async function yarnInstall(cwd) {
  const hasPackageJson = await existsPromise(`${cwd}/package.json`);

  if (hasPackageJson) {
    await removeNodeModules(cwd);

    await execPromise("yarn", {
      cwd,
      TIMEOUT,
    });
  }
}

module.exports = yarnInstall;
