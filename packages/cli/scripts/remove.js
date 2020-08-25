"use strict";

const chalk = require("chalk");

const logger = require("./util/logger");
const { destroy } = require("./config/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  logger.log(chalk.grey("Removing " + (argv.stack ? argv.stack : "stacks")));
  await destroy({ ...cliInfo.cdkOptions, stackName: argv.stack });
};
