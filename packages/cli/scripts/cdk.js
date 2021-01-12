"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

let argv = process.argv.slice(2);

const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./util/paths");
const cdkOptions = require("./util/cdkOptions");

// CDK command
spawn.sync(
  path.join(paths.ownNodeModules, ".bin/cdk"),
  ["--app", cdkOptions.app].concat(argv),
  { stdio: "inherit" }
);
