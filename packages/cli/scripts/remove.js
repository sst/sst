"use strict";

const chalk = require("chalk");

const logger = require("./util/logger");
const { destroy } = require("./config/cdkHelpers");

module.exports = async function (argv) {
  logger.log(chalk.grey("Removing " + (argv.stack ? argv.stack : "stacks")));
  await destroy(argv.stack);
};
