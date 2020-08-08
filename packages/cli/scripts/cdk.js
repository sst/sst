"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

let argv = process.argv.slice(3);

const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./config/paths");
const { prepareCdk } = require("./config/cdkHelpers");

// Prepare app
prepareCdk();

// CDK command
spawn.sync(path.join(paths.ownNodeModules, ".bin/cdk"), argv, {
  stdio: "inherit",
  cwd: paths.appBuildPath,
});
