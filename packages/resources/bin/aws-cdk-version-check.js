#!/usr/bin/env node

/**
 * Keep the AWS CDK version in sync with the forked version we are using in
 * @serverless-stack/core. Can cause unexpected issues if out of sync.
 * More here https://github.com/aws/aws-cdk/issues/542#issuecomment-449694450
 */

import { join } from "path";
import fs from "fs";
import { dirname } from "dirname-filename-esm";
const __dirname = dirname(import.meta);

// Make sure any symlinks in the project folder are resolved:

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

const cdkVersion = JSON.parse(
  fs.readFileSync(join(__dirname, "../../core/package.json"))
).dependencies["aws-cdk"];

const packageJson = JSON.parse(
  fs.readFileSync(join(__dirname, "../package.json"))
);
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
    "\n❌ AWS CDK versions in @serverless-stack/resources is not in sync with @serverless-stack/core. Fix using:\n"
  );

  if (mismatchedDeps.length > 0) {
    const depString = formatDepsForInstall(mismatchedDeps, cdkVersion);
    console.log(`  yarn add ${depString} --exact`);
  }
  if (mismatchedDevDeps.length > 0) {
    const depString = formatDepsForInstall(mismatchedDevDeps, cdkVersion);
    console.log(`  yarn add ${depString} --dev --exact`);
  }

  console.log("");

  process.exit(1);
}

console.log(
  "✅ AWS CDK versions in @serverless-stack/resources is in sync with @serverless-stack/core"
);

process.exit(0);
