#!/usr/bin/env node

/**
 * Create the stub Lambda. We are zipping the sub directory inside a script
 * because zip command does not work on Windows. We used to create the zip
 * inside package.json, and it failed on Windows.
 * ie. "build": "tsc --rootDir src --outDir dist && cd assets/stub && yarn && zip -r ../../dist/stub.zip ."
 */

const path = require("path");
const zipLocal = require("zip-local");

function zip(dir, zipFile) {
  try {
    zipLocal.sync.zip(dir).compress().save(zipFile);
  } catch (e) {
    console.log(e);
    console.error("There was a problem generating stub Lambda package.");
    process.exit(1);
  }
}

const dir = path.join(__dirname, "../assets/stub");
const zipFile = path.join(__dirname, "../dist/stub.zip");
zip(dir, zipFile);

console.log("✅ Stub Lambda is successfully created.");

process.exit(0);
