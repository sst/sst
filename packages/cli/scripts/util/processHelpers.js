const { logger: rootLogger } = require("@serverless-stack/core");

function exitWithMessage(message, logger) {
  logger = logger || rootLogger;

  // Move newline before message
  if (message.indexOf("\n") === 0) {
    logger.info("");
  }
  logger.error(message.trimStart());

  process.exit(1);
}

module.exports = {
  exitWithMessage,
};
