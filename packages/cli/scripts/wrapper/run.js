#!/usr/bin/env node

"use strict";

require("source-map-support").install();

const sst = require("@serverless-stack/resources");

const config = require("./sst-merged.json");
const main = require("./");

main.default(
  new sst.App({
    name: config.name,
    stage: config.stage,
    region: config.region,
  })
);
