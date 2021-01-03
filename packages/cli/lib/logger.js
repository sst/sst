const { createLogger, format, transports } = require("winston");
const LEVEL = Symbol.for("level");
const paths = require("../scripts/util/paths");

const consoleLogFormat = format.printf(
  ({ level, message, label, timestamp, [LEVEL]: rawLevel }) => {
    if (process.env.DEBUG) {
      return `${timestamp} [${label}] ${level}: ${message}`;
    } else {
      // logger.info('hi') => hi
      // logger.warn('hi') => warn hi
      // childLogger.warn('hi') => [child] warn hi
      if (rawLevel === "info") {
        return message;
      } else {
        return label ? `[${label}] ${level} ${message}` : `${level} ${message}`;
      }
    }
  }
);

const fileLogFormat = format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
  transports: [
    new transports.Console({
      level: process.env.DEBUG ? "debug" : "info",
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        consoleLogFormat
      ),
    }),
  ],
});

function addFileTransport() {
  logger.add(
    new transports.File({
      filename: `${paths.appBuildPath}/sst-debug.log`,
      maxsize: 1024 * 1024 * 10,
      maxFiles: 5,
      tailable: true,
      level: "silly",
      format: format.combine(format.timestamp(), fileLogFormat),
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

module.exports = {
  addFileTransport,
  logger,
};
