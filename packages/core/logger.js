"use strict";

const path = require("path");
const jsonStringify = require("fast-safe-stringify");
const { createLogger, format, transports } = require("winston");
const SPLAT = Symbol.for("splat");

const consoleLogFormat = format.printf(({ message, [SPLAT]: splat }) => {
  return joinMessageAndSplat(message, splat);
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

const logger = createLogger({
  transports: [ consoleTransport ],
});

const initializeLogger = function (appBuildPath) {
  // Update level for console transport
  consoleTransport.level = process.env.DEBUG ? "debug" : "info";

  // Add file transport
  logger.add(
    new transports.File({
      filename: path.join(appBuildPath, 'sst-debug.log'),
      maxsize: 1024 * 1024 * 10,
      maxFiles: 5,
      tailable: true,
      level: "silly",
      format: format.combine(format.timestamp(), fileLogFormat),
      handleExceptions: true,
      handleRejections: true,
    })
  );

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
