#!/usr/bin/env node

"use strict";

const config = require("./sst-merged.json");
const App = require("./include");
const main = require("./");

main.default(
  new App.default({
    name: config.name,
    stage: config.stage,
    region: config.region,
  })
);
