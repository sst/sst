import { promisify } from "util";
import { exec } from "child_process";
import yarnInstall from "./yarn-install";

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function runCdkCommand(cwd, cmd) {
  await yarnInstall(cwd);

  let result, error;

  try {
    result = await execPromise(
      `yarn cdk --app="build/run.js" --no-color ${cmd}`,
      { cwd, TIMEOUT }
    );
  } catch (e) {
    error = e.toString() + e.stdout;
  }

  return error
    ? error
    : result.stdout.toString("utf8") + result.stderr.toString("utf8");
}

module.exports = runCdkCommand;
