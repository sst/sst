#!/usr/bin/env node

/**
 * Create the stub Lambda. We are zipping the sub directory inside a script
 * because zip command does not work on Windows. We used to create the zip
 * inside package.json, and it failed on Windows.
 * ie. "build": "tsc --rootDir src --outDir dist && cd assets/stub && yarn && zip -r ../../dist/stub.zip ."
 */

const path = require("path");
const fs = require("fs-extra");

const input = path.join(__dirname, "../assets/stub");
const output = path.join(__dirname, "../dist/stub");
fs.removeSync(output);
fs.cpSync(input, output, {
  recursive: true,
});

console.log("✅ Stub Lambda is successfully created.");

process.exit(0);
