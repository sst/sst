const { promisify } = require("util");
const { exec } = require("child_process");
const yarnInstall = require("./yarn-install");

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function runRemoveCommand(cwd) {
  await yarnInstall(cwd);

  try {
    const result = await execPromise(`yarn sst remove`, {
      cwd,
      env: { ...process.env, __TEST__: "true" },
      TIMEOUT,
    });
    return result.stdout.toString("utf8") + result.stderr.toString("utf8");
  } catch (e) {
    return e.stdout + " " + e.stderr;
  }
}

module.exports = runRemoveCommand;
