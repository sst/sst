const { promisify } = require("util");
const { exec } = require("child_process");

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function clearBuildOutput(cwd) {
  await execPromise("rm -rf .build/", {
    cwd,
    TIMEOUT,
  });
}

module.exports = clearBuildOutput;
