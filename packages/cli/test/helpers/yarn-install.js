import { promisify } from "util";
import { exec } from "child_process";
import { exists } from "fs";

const execPromise = promisify(exec);
const existsPromise = promisify(exists);
const TIMEOUT = 30000;

async function yarnInstall(cwd) {
  const hasPackageJson = await existsPromise(`${cwd}/package.json`);

  if (hasPackageJson) {
    await execPromise("yarn", {
      cwd,
      TIMEOUT,
    });
  }
}

module.exports = yarnInstall;
