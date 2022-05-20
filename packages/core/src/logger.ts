"use strict";

import path from "path";
import log4js from "log4js";

log4js.configure({
  appenders: {
    console: { type: "console", layout: { type: "messagePassThrough" } },
  },
  categories: {
    default: { appenders: ["console"], level: "info" },
  },
});
export const logger = log4js.getLogger();

export const initializeLogger = function (appBuildPath: string) {
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

export const getChildLogger = log4js.getLogger;
