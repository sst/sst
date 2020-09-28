/**
 * Gets the forked AWS CDK version from @serverless-stack/core
 * And makes sure all the package.json files in the tests are using the same version.
 */

const path = require("path");
const replace = require("replace-in-file");

const sstCdkVersion = require(path.join(
  __dirname,
  "../../../core/package.json"
)).dependencies["sst-cdk"];
const cdkVersion = sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];

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
