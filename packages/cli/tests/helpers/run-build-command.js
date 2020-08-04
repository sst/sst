const { promisify } = require("util");
const { exec } = require("child_process");
const yarnInstall = require("./yarn-install");

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function runBuildCommand(cwd, stack) {
  stack = stack ? ` ${stack}` : "";

  await yarnInstall(cwd);

  const { stdout, stderr } = await execPromise(`yarn run build${stack}`, {
    cwd,
    TIMEOUT,
  });

  return stdout.toString("utf8") + stderr.toString("utf8");
}

module.exports = runBuildCommand;
