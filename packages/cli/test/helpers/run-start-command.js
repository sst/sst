import { promisify } from "util";
import { exec } from "child_process";
import yarnInstall from "./yarn-install";

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function runStartCommand(cwd) {
  await yarnInstall(cwd);

  let result, error;

  try {
    result = await execPromise(`yarn run start --outputs-file outputs.json`, {
      cwd,
      env: { ...process.env, __TEST__: "true" },
      TIMEOUT,
    });
  } catch (e) {
    error = e.toString() + e.stdout;
  }

  return error
    ? error
    : result.stdout.toString("utf8") + result.stderr.toString("utf8");
}

module.exports = runStartCommand;
