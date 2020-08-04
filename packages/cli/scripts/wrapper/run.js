#!/usr/bin/env node

"use strict";

const fs = require("fs");

const App = require("./include");
const main = require("./");

const configPath = "../sst.json";
const config = fs.existsSync(configPath) ? require(configPath) : {};

const optionsPath = "./options.json";
const options = fs.existsSync(optionsPath) ? require(optionsPath) : {};

const name = config.name;
const stage = options.stage || config.stage;
const region =
  options.region || config.region || process.env.CDK_DEFAULT_REGION;

main.default(
  new App.default({
    name,
    stage,
    region,
  })
);
