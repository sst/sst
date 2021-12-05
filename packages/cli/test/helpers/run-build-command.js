import { promisify } from "util";
import { exec } from "child_process";
import yarnInstall from "./yarn-install";

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function runBuildCommand(cwd, stack) {
  stack = stack ? ` ${stack}` : "";

  await yarnInstall(cwd);

  let result, error;

  try {
    result = await execPromise(`yarn run build${stack} --no-color`, {
      cwd,
      TIMEOUT,
    });
  } catch (e) {
    error = e.toString() + e.stdout;
  }

  return error
    ? error
    : result.stdout.toString("utf8") + result.stderr.toString("utf8");
}

module.exports = runBuildCommand;
