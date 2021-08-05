"use strict";

const path = require("path");
const log4js = require("log4js");

log4js.configure({
  appenders: {
    console: { type: "console", layout: { type: "messagePassThrough" } },
  },
  categories: {
    default: { appenders: ["console"], level: "info" },
  },
});
const logger = log4js.getLogger();

const initializeLogger = function (appBuildPath) {
  // Initialize logger does 2 things:
  // - update 'console' appender's level based on the DEBUG flag
  // - create 'file' appender to log to sst-debug.log
  log4js.configure({
    appenders: {
      file: {
        type: "fileSync",
        filename: path.join(appBuildPath, "sst-debug.log"),
      },
      console: { type: "console", layout: { type: "messagePassThrough" } },
      consoleFilter: {
        type: "logLevelFilter",
        level: process.env.DEBUG ? "debug" : "info",
        appender: "console",
      },
    },
    categories: {
      default: { appenders: ["consoleFilter", "file"], level: "trace" },
    },
  });
};

module.exports = {
  logger,
  initializeLogger,
  getChildLogger: log4js.getLogger,
};
