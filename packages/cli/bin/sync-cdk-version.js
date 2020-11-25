#!/usr/bin/env node

/**
 * Gets the forked AWS CDK version from @serverless-stack/core and makes sure:
 *  - The aws-cdk package used for the cdk command is the same version
 *  - All the package.json files in the tests are using the same version
 */

const path = require("path");
const replace = require("replace-in-file");

const sstCdkVersion = require(path.join(
  __dirname,
  "../../../core/package.json"
)).dependencies["sst-cdk"];
const cdkVersion = sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];

/**
 * Check for cdk command
 */
const packageJson = require(path.join(__dirname, "../../package.json"));

if (packageJson.dependencies["aws-cdk"] !== cdkVersion) {
  console.log(
    "\n❌ aws-cdk version in @serverless-stack/cli is not in sync with @serverless-stack/core. Fix using:\n"
  );
  console.log(`  yarn add --exact aws-cdk@${cdkVersion}`);

  console.log("");

  process.exit(1);
}

console.log(
  "✅ aws-cdk version in @serverless-stack/cli is in sync with @serverless-stack/core"
);

/**
 * Check for tests
 */
try {
  const results = replace.sync({
    //dry     : true,
    files: "test/*/package.json",
    ignore: "test/mismatched-cdk-versions/package.json",
    from: /"(@?aws-cdk.*)": "[^~]?(\d+\.\d+\.\d+)"/g,
    to: `"$1": "${cdkVersion}"`,
  });

  const changedFiles = results
    .filter((result) => result.hasChanged)
    .map((result) => result.file);

  if (changedFiles.length > 0) {
    console.log("Updating CDK versions in tests:\n");
    console.log("  " + changedFiles.join("\n  ") + "\n");
  }
} catch (error) {
  console.error("Error occurred:", error);
}
