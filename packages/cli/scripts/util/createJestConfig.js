/* eslint-disable */
/**
 * Based on https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/scripts/utils/createJestConfig.js
 */
"use strict";

const fs = require("fs");
const chalk = require("chalk");
const paths = require("./paths");

module.exports = (resolve, rootDir) => {
  const config = {
    collectCoverageFrom: ["./**/*.{js,jsx,ts,tsx}"],
    testMatch: [
      "<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "<rootDir>/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
    transform: {
      "\\.ts$": "esbuild-runner/jest",
      "\\.js$": "esbuild-runner/jest",
    },
    transformIgnorePatterns: [
      "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|ts|tsx)$",
    ],
  };
  if (rootDir) {
    config.rootDir = rootDir;
  }
  const overrides = Object.assign({}, require(paths.appPackageJson).jest);
  const supportedKeys = [
    "collectCoverageFrom",
    "coverageReporters",
    "coverageThreshold",
    "extraGlobals",
    "globalSetup",
    "globalTeardown",
    "reporters",
    "resetMocks",
    "resetModules",
    "setupFilesAfterEnv",
    "snapshotSerializers",
    "testPathIgnorePatterns",
    "testResultsProcessor",
    "transform",
    "transformIgnorePatterns",
    "watchPathIgnorePatterns",
    "moduleNameMapper",
  ];
  if (overrides) {
    supportedKeys.forEach((key) => {
      if (overrides.hasOwnProperty(key)) {
        if (Array.isArray(config[key]) || typeof config[key] !== "object") {
          // for arrays or primitive types, directly override the config key
          config[key] = overrides[key];
        } else {
          // for object types, extend gracefully
          config[key] = Object.assign({}, config[key], overrides[key]);
        }

        delete overrides[key];
      }
    });
    const unsupportedKeys = Object.keys(overrides);
    if (unsupportedKeys.length) {
      const isOverridingSetupFile =
        unsupportedKeys.indexOf("setupFilesAfterEnv") > -1;

      console.error(
        chalk.red(
          "\nOut of the box, @serverless-stack/resources only supports overriding " +
            "these Jest options:\n\n" +
            supportedKeys
              .map((key) => chalk.bold("  \u2022 " + key))
              .join("\n") +
            ".\n\n" +
            "These options in your package.json Jest configuration " +
            "are not currently supported by @serverless-stack/resources:\n\n" +
            unsupportedKeys
              .map((key) => chalk.bold("  \u2022 " + key))
              .join("\n") +
            "\n\nIf you wish to override other Jest options, " +
            "consider using @serverless-stack/resources directly instead.\n"
        )
      );

      process.exit(1);
    }
  }
  return config;
};
