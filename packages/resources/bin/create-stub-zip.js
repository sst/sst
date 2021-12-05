#!/usr/bin/env node

/**
 * Create the stub Lambda. We are zipping the sub directory inside a script
 * because zip command does not work on Windows. We used to create the zip
 * inside package.json, and it failed on Windows.
 * ie. "build": "tsc --rootDir src --outDir dist && cd assets/stub && yarn && zip -r ../../dist/stub.zip ."
 */

import { join } from "path";
import zipLocal from "zip-local";
import { dirname } from "dirname-filename-esm";
const __dirname = dirname(import.meta);

function zip(dir, zipFile) {
  try {
    zipLocal.sync.zip(dir).compress().save(zipFile);
  } catch (e) {
    console.log(e);
    console.error("There was a problem generating stub Lambda package.");
    process.exit(1);
  }
}

const dir = join(__dirname, "../assets/stub");
const zipFile = join(__dirname, "../dist/stub.zip");
zip(dir, zipFile);

console.log("✅ Stub Lambda is successfully created.");

process.exit(0);
