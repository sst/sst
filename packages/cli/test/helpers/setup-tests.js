const path = require("path");
const { execSync } = require("child_process");

const TIMEOUT = 30000;
const root = process.cwd();

// Prepare resources
execSync("yarn build", {
  cwd: path.resolve(root, "../.."),
  TIMEOUT,
});

/*
The default timeout is 5000ms on async tests.
Because we npm install and remove directories, tests can take time to run.
Setting to 2 minutes to support slow machines.
*/
jest.setTimeout(120000);
