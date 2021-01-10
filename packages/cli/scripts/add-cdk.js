"use strict";

const chalk = require("chalk");
const spawn = require("cross-spawn");
const { logger } = require("@serverless-stack/core");

module.exports = async function (argv, cliInfo) {
  const npm = cliInfo.npm;
  const dryRun = argv.dryRun;
  const cdkVersion = cliInfo.cdkVersion;
  const packages = argv.packages.map((pkg) => `${pkg}@${cdkVersion}`);

  const command = npm ? "npm" : "yarn";
  const helperCopy = dryRun ? "Dry run" : "Running";

  let args = npm ? ["install", "--save-exact"] : ["add", "--exact"];

  if (argv.dev) {
    args = args.concat(npm ? "--save-dev" : "--dev");
  }

  args = args.concat(packages);

  logger.info(chalk.grey(`${helperCopy}: ${command} ${args.join(" ")}`));

  if (dryRun) {
    return;
  }

  spawn.sync(command, args, { stdio: "inherit" });
};
