/**
 * Gets the forked AWS CDK version from @serverless-stack/cli and writes to a temp file.
 * Replaces the version in the template package.json.
 */

const fs = require("fs");
const path = require("path");

const sstCdkVersion = require(path.join(__dirname, "../../cli/package.json"))
  .dependencies["sst-cdk"];
const cdkVersion = sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];

fs.writeFileSync(path.join(__dirname, "../CDK_VERSION"), cdkVersion);

console.log(`Syncing with sst-cdk version ${cdkVersion}`);
