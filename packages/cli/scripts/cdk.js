"use strict";
const path = require("path");
const fs = require("fs");
const pathsUtil = require("../scripts/util/paths");
const yargs = require("yargs");
// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

let argv = process.argv.slice(2);

const spawn = require("cross-spawn");

const cdkOptions = require("./util/cdkOptions");
const { getCdkBinPath } = require("./util/cdkHelpers");

//Try to read build dir from sst.json
let config = { buildDir: pathsUtil.DEFAULT_BUILD_DIR };
try {
  const configPath = path.join(pathsUtil.appPath, "sst.json");
  config = fs.readJsonSync(configPath);
} catch (e) {
  /* Use default config */
}

//Supplied cli args override the json config
const yArgv = yargs(argv).alias("o", "output").argv;
const outFlag = yArgv.o ? [] : ["--output", config.buildDir];

const configuredOptions = cdkOptions(config.buildDir);

// CDK command
spawn.sync(
  getCdkBinPath(),
  ["--app", configuredOptions.app, ...outFlag].concat(argv),
  {
    stdio: "inherit",
  }
);
