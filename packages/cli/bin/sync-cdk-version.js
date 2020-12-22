#!/usr/bin/env node

/**
 * Gets the forked AWS CDK version from @serverless-stack/core and makes sure:
 *  - The aws-cdk package used for the cdk command is the same version
 *  - All the package.json files in the tests are using the same version
 */

const path = require("path");
const replace = require("replace-in-file");

const sstCdkVersion = require(path.join(__dirname, "../../core/package.json"))
  .dependencies["sst-cdk"];
const cdkVersion = sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];

/**
 * Check for cdk command
 */
const packageJson = require(path.join(__dirname, "../package.json"));

const mismatchedDeps = filterMismatchedVersion(
  packageJson.dependencies,
  cdkVersion
);
const mismatchedDevDeps = filterMismatchedVersion(
  packageJson.devDependencies,
  cdkVersion
);

if (mismatchedDeps.length !== 0 || mismatchedDevDeps.length !== 0) {
  console.log(
    "\n❌ AWS CDK packages in @serverless-stack/cli are not in sync with @serverless-stack/core. Fix using:\n"
  );

  if (mismatchedDeps.length > 0) {
    const depString = formatDepsForInstall(mismatchedDeps, cdkVersion);
    console.log(`  yarn add ${depString} --exact`);
  }
  if (mismatchedDevDeps.length > 0) {
    const devDepString = formatDepsForInstall(mismatchedDevDeps, cdkVersion);
    console.log(`  yarn add ${devDepString} --dev --exact`);
  }

  console.log("");
  process.exit(1);
}

console.log(
  "✅ AWS CDK packages in @serverless-stack/cli are in sync with @serverless-stack/core"
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

function filterMismatchedVersion(deps, version) {
  const mismatched = [];

  for (let dep in deps) {
    if (/^@?aws-cdk/.test(dep) && deps[dep] !== version) {
      mismatched.push(dep);
    }
  }

  return mismatched;
}

function formatDepsForInstall(depsList, version) {
  return depsList.map((dep) => `${dep}@${version}`).join(" ");
}
