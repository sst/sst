"use strict";

const chalk = require("chalk");

const logger = require("./util/logger");
const { deploy } = require("./config/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  logger.log(chalk.grey("Deploying " + (argv.stack ? argv.stack : "stacks")));
  await deploy({ ...cliInfo.cdkOptions, stackName: argv.stack });
};
