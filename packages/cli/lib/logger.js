const { createLogger, format, transports } = require("winston");
const jsonStringify = require("fast-safe-stringify");
const SPLAT = Symbol.for("splat");
const paths = require("../scripts/util/paths");

const consoleLogFormat = format.printf(({ message, label, [SPLAT]: splat }) => {
  message = joinMessageAndSplat(message, splat);

  // handle label
  // childLogger.info('hi') => [child] hi
  message = label ? `[${label}] ${message}` : message;

  return message;
});

const fileLogFormat = format.printf(
  ({ level, message, [SPLAT]: splat, label, timestamp }) => {
    message = joinMessageAndSplat(message, splat);
    return label
      ? `${timestamp} [${label}] ${level}: ${message}`
      : `${timestamp} ${level}: ${message}`;
  }
);

const consoleTransport = new transports.Console({
  level: "info",
  format: format.combine(format.colorize(), consoleLogFormat),
});

const fileTransport = new transports.File({
  filename: `${paths.appBuildPath}/sst-debug.log`,
  maxsize: 1024 * 1024 * 10,
  maxFiles: 5,
  tailable: true,
  level: "silly",
  format: format.combine(format.timestamp(), fileLogFormat),
  handleExceptions: true,
  handleRejections: true,
});

const logger = createLogger({
  transports: [consoleTransport],
});

const initializeLogger = function () {
  // Update level for console transport
  consoleTransport.level = process.env.DEBUG ? "debug" : "info";

  // Add file transport
  logger.add(fileTransport);
};

function joinMessageAndSplat(message, splat) {
  return [message]
    .concat(splat || [])
    .map((arg) => (typeof arg === "string" ? arg : jsonStringify(arg)))
    .join(" ");
}

module.exports = {
  logger,
  initializeLogger,
};
