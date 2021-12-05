#!/usr/bin/env node

"use strict";

import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();

process.on("uncaughtException", function (err) {
  console.error("\n" + (err.stack || err) + "\n");
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  throw err;
});

import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import sst from "@serverless-stack/resources";
import { initializeLogger, Util } from "@serverless-stack/core";

import config from "./sst-merged.json";
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
Util.Environment.load({
  searchPaths: [`.env.${config.stage}.local`, `.env.${config.stage}`],
});

// Check first and throw an error
if (!fs.existsSync(path.join(__dirname, "lib", "index.js"))) {
  console.error(
    `\nCannot find app handler. There was a problem transpiling the source.\n`
  );
  process.exit(1);
}

const synthCallback = (lambdaHandlers, staticSiteEnvironments) => {
  // When run inside `sst start`, we need to store a list of handlers to file
  // for `sst start` to use
  if (config.debugEndpoint) {
    fs.writeFileSync(
      path.join(appPath, buildDir, "lambda-handlers.json"),
      JSON.stringify(lambdaHandlers)
    );
  }

  // Store StaticSite environment data
  fs.writeFileSync(
    path.join(appPath, buildDir, "static-site-environment-output-keys.json"),
    JSON.stringify(staticSiteEnvironments)
  );
};

const app = new sst.App({
  buildDir,
  synthCallback,
  name: config.name,
  lint: config.lint,
  stage: config.stage,
  region: config.region,
  typeCheck: config.typeCheck,
  skipBuild: config.skipBuild,
  esbuildConfig: config.esbuildConfig,
  debugEndpoint: config.debugEndpoint,
  debugBucketArn: config.debugBucketArn,
  debugBucketName: config.debugBucketName,
  debugStartedAt: config.debugStartedAt,
  debugIncreaseTimeout: config.debugIncreaseTimeout,
  debugBridge: config.debugBridge,
});

// Run the handler
import * as handler from "./lib/index.js";
if (!handler.default) {
  console.error(
    `\nCannot find app handler. Make sure "${config.main}" has a default export.\n`
  );
  process.exit(1);
}
handler.default(app);
