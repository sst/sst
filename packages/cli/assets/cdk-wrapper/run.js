#!/usr/bin/env node

"use strict";

require("source-map-support").install();

process.on("uncaughtException", function (err) {
  console.error("\n" + (err.stack || err) + "\n");
  process.exit(1);
});

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const sst = require("@serverless-stack/resources");
const { initializeLogger } = require("@serverless-stack/core");

const config = require("./sst-merged.json");
const appPath = process.cwd();
const buildDir = ".build";

// Initialize logger
initializeLogger(path.join(appPath, buildDir));

// Disable color
if (process.env.NO_COLOR === "true") {
  chalk.level = 0;
}

// Set IS_LOCAL environment variable
if (config.debugEndpoint) {
  process.env.IS_LOCAL = "true";
}

// Load environment variables from dotenv
loadDotenv(config.stage);

// Check first and throw an error
if (!fs.existsSync(path.join(__dirname, "lib", "index.js"))) {
  handlerNotFound(true);
}

// When run inside `sst start`, we need to store a list of handlers to file for `sst start` to use
let synthCallback;
if (config.debugEndpoint) {
  synthCallback = (lambdaHandlers, staticSiteEnvironments) => {
    fs.writeFileSync(
      path.join(appPath, buildDir, "lambda-handlers.json"),
      JSON.stringify(lambdaHandlers)
    );
    fs.writeFileSync(
      path.join(appPath, buildDir, "static-site-environment-output-keys.json"),
      JSON.stringify(staticSiteEnvironments)
    );
  };
}

const app = new sst.App({
  buildDir,
  synthCallback,
  name: config.name,
  lint: config.lint,
  stage: config.stage,
  region: config.region,
  typeCheck: config.typeCheck,
  skipBuild: config.skipBuild,
  debugEndpoint: config.debugEndpoint,
  debugBucketArn: config.debugBucketArn,
  debugBucketName: config.debugBucketName,
  debugIncreaseTimeout: config.debugIncreaseTimeout,
});

// Run the handler
const handler = require("./lib");
if (!handler.default) {
  handlerNotFound(false);
}
handler.default(app);

function loadDotenv(stage) {
  [`.env.${stage}.local`, `.env.${stage}`, `.env.local`, `.env`]
    .map((file) => path.join(appPath, file))
    .filter((path) => fs.existsSync(path))
    .map((path) => {
      const result = dotenv.config({ path, debug: process.env.DEBUG });
      if (result.error) {
        console.error(`Failed to load environment variables from "${path}".`);
        console.error(result.error.message);
        process.exit(1);
      }
      return dotenvExpand(result);
    });
}

function handlerNotFound(importFailed) {
  const extCopy = fs.existsSync(path.join(appPath, "tsconfig.json"))
    ? "ts"
    : "js";
  const configFile = config.main || `lib/index.${extCopy}`;
  console.error(
    importFailed
      ? `\nCannot find app handler. Make sure to add a "${configFile}" file.\n`
      : `\nCannot find app handler. Make sure "${configFile}" has a default export.\n`
  );
  process.exit(1);
}
