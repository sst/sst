const chalk = require("chalk");

function debug(message) {
  if (!process.env.DEBUG) {
    return;
  }
  console.debug(chalk.grey("debug ") + message);
}
function log(message) {
  console.log(message);
}
function warn(message) {
  console.warn(chalk.yellow("warn ") + message);
}
function error(message) {
  console.error(chalk.red("error ") + message);
}

module.exports = {
  log,
  warn,
  debug,
  error,
};
