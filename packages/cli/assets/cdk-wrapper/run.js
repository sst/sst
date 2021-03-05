#!/usr/bin/env node

"use strict";

require("source-map-support").install();

process.on("uncaughtException", function (err) {
  console.error("\n" + (err.stack || err) + "\n");
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
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

// Check first and throw an error
if (!fs.existsSync(path.join(__dirname, "lib", "index.js"))) {
  handlerNotFound(true);
}

const handler = require("./lib");

if (!handler.default) {
  handlerNotFound(false);
}

// When run inside `sst start`, we need to store a list of handlers to file for `sst start` to use
let synthCallback;
if (config.debugEndpoint) {
  synthCallback = (lambdaHandlers) => {
    fs.writeFileSync(
      path.join(appPath, buildDir, "lambda-handlers.json"),
      JSON.stringify(lambdaHandlers)
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
  sstCliPath: config.sstCliPath,
  debugEndpoint: config.debugEndpoint,
});

// Run the handler
handler.default(app);

function handlerNotFound(importFailed) {
  const extCopy = fs.existsSync(path.join(appPath, "tsconfig.json"))
    ? "ts"
    : "js";
  console.error(
    importFailed
      ? `\nCannot find app handler. Make sure to add a "lib/index.${extCopy}" file.\n`
      : `\nCannot find app handler. Make sure "lib/index.${extCopy}" has a default export.\n`
  );
  process.exit(1);
}
