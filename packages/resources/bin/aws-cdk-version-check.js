#!/usr/bin/env node

/**
 * Keep the AWS CDK version in sync with the forked version we are using in
 * @serverless-stack/core. Can cause unexpected issues if out of sync.
 * More here https://github.com/aws/aws-cdk/issues/542#issuecomment-449694450
 */

const path = require("path");

///////////////////////////
// Check for cdk command
///////////////////////////

const cdkVersion = require(path.join(__dirname, "../../core/package.json"))
  .dependencies["aws-cdk-lib"];
const packageJson = require(path.join(__dirname, "../package.json"));

// Check v1 dependencies
const v1Deps = filterV1Deps(packageJson.dependencies);
if (v1Deps.length !== 0) {
  console.log(
    "\n❌ Please update the following dependencies in @serverless-stack/resources to AWS CDK v2:\n"
  );
  v1Deps.forEach(dep => console.log(`  ${dep}`));
  console.log("");
  process.exit(1);
}

// Check mismatched v2 dependencies
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

///////////////
// Functions
///////////////

function filterV1Deps(deps) {
  const v1Deps = [];

  for (let dep in deps) {
    if (dep.startsWith("@aws-cdk/") && !dep.endsWith("-alpha")) {
      v1Deps.push(dep);
    };
  }

  return v1Deps;
}

function filterMismatchedVersion(deps, version) {
  const mismatched = [];

  for (let dep in deps) {
    if (dep === "aws-cdk-lib" && deps[dep] !== version) {
      mismatched.push(dep);
    }
    else if (dep.startsWith("@aws-cdk/") && dep.endsWith("-alpha") && !deps[dep].startsWith(`${version}-alpha.`) && !deps[dep].startsWith(`~${version}-alpha.`)) {
      mismatched.push(dep);
    }
  };

  return mismatched;
}

function formatDepsForInstall(depsList, version) {
  return depsList.map((dep) => {
    return dep === "aws-cdk-lib"
      ? `${dep}@${version}`
      : `${dep}@~${version}-alpha.0`;
  }).join(" ");
}
