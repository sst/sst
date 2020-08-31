/**
 * Gets the forked AWS CDK version from @serverless-stack/cli and writes to a temp file.
 * Replaces the version in the template package.json.
 */

const path = require("path");
const replace = require("replace-in-file");

const sstCdkVersion = require(path.join(__dirname, "../../package.json"))
  .dependencies["@serverless-stack/aws-cdk"];
const cdkVersion = sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];

try {
  const results = replace.sync({
    //dry     : true,
    files: "test/*/package.json",
    ignore: "test/mismatched-cdk-versions/package.json",
    from: /"(@*aws-cdk.*)": "(\d+\.\d+\.\d+)"/g,
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
