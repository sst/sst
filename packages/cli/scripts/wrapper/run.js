#!/usr/bin/env node

"use strict";

require("source-map-support").install();

process.on("uncaughtException", function (err) {
  console.error("\n" + (err.stack || err) + "\n");
  process.exit(1);
});

const fs = require("fs");
const path = require("path");
const sst = require("@serverless-stack/resources");

const config = require("./sst-merged.json");

function handlerNotFound(importFailed) {
  const extCopy = fs.existsSync(path.join(__dirname, "../", "tsconfig.json"))
    ? "ts"
    : "js";
  console.error(
    importFailed
      ? `\nCannot find app handler. Make sure to add a "lib/index.${extCopy}" file.\n`
      : `\nCannot find app handler. Make sure "lib/index.${extCopy}" has a default export.\n`
  );
  process.exit(1);
}

// Check first and throw an error
if (!fs.existsSync(path.join(__dirname, "index.js"))) {
  handlerNotFound(true);
}

const handler = require("./");

if (!handler.default) {
  handlerNotFound(false);
}

handler.default(
  new sst.App({
    name: config.name,
    stage: config.stage,
    region: config.region,
  })
);
