const { promisify } = require("util");
const { exec } = require("child_process");

const execPromise = promisify(exec);
const TIMEOUT = 30000;

async function removeNodeModules(cwd) {
  await execPromise("rm -rf node_modules/", {
    cwd,
    TIMEOUT,
  });
}

module.exports = removeNodeModules;
