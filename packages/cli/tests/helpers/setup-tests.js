const path = require("path");
const { execSync } = require("child_process");

const TIMEOUT = 30000;
const root = process.cwd();

// Prepare resources
execSync("yarn run prepare", {
  cwd: path.resolve(root, "../resources"),
  TIMEOUT,
});

// Prepare CLI
execSync("yarn run prepare", {
  cwd: root,
  TIMEOUT,
});

/*
The default timeout is 5000ms on async tests.
Because we npm install and remove directories, tests can take time to run.
Setting to 1.5 minutes to support slow machines.
*/
jest.setTimeout(90000);
