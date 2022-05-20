const { promisify } = require("util");
const { exec } = require("child_process");
const { exists } = require("fs");

const execPromise = promisify(exec);
const existsPromise = promisify(exists);
const TIMEOUT = 30000;

async function yarnInstall(cwd) {
  const hasPackageJson = await existsPromise(`${cwd}/package.json`);

  if (hasPackageJson) {
    await execPromise("yarn", {
      cwd,
      stdio: "inherit",
      TIMEOUT,
    });
  }
}

module.exports = yarnInstall;
