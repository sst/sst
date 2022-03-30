#!/usr/bin/env node

/**
 * Gets the forked AWS CDK version from @serverless-stack/core and writes to a temp file.
 * Replaces the version in the template package.json.
 */

const fs = require("fs");
const path = require("path");

const cdkVersion = require(path.join(__dirname, "../../core/package.json"))
  .dependencies["aws-cdk-lib"];

fs.writeFileSync(path.join(__dirname, "../CDK_VERSION"), cdkVersion);

console.log(`Syncing with aws-cdk version ${cdkVersion}`);
