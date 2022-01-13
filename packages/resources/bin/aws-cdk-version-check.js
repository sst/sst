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
const v1Deps = filterV1Deps({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});
if (v1Deps.length !== 0) {
  console.log(
    "\n❌ The following AWS CDK packages in @serverless-stack/resources need to be updated to AWS CDK v2:\n"
  );
  v1Deps.forEach((dep) => console.log(`  ${dep}`));
  console.log("");
  process.exit(1);
}

// Check mismatched v2 dependencies
const mismatchedDeps = filterMismatchedVersion(
  packageJson.dependencies,
  cdkVersion
);

if (mismatchedDeps.length !== 0) {
  console.log(
    "\n❌ AWS CDK versions in @serverless-stack/resources is not in sync with @serverless-stack/core. Fix using:\n"
  );

  if (mismatchedDeps.length > 0) {
    const depString = formatDepsForInstall(mismatchedDeps, cdkVersion);
    console.log(`  yarn add ${depString} --exact`);
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
    if (isCdkV1Dep(dep)) {
      v1Deps.push(dep);
    }
  }

  return v1Deps;
}

function filterMismatchedVersion(deps, version) {
  const mismatched = [];

  for (let dep in deps) {
    if (isCdkV2CoreDep(dep) && deps[dep] !== version) {
      mismatched.push(dep);
    } else if (
      isCdkV2AlphaDep(dep) &&
      !deps[dep].startsWith(`${version}-alpha.`)
    ) {
      mismatched.push(dep);
    }
  }

  return mismatched;
}

function formatDepsForInstall(depsList, version) {
  return depsList
    .map((dep) => {
      return isCdkV2CoreDep(dep)
        ? `${dep}@${version}`
        : `${dep}@${version}-alpha.0`;
    })
    .join(" ");
}

function isCdkV2CoreDep(dep) {
  return dep === "aws-cdk" || dep === "aws-cdk-lib";
}

function isCdkV2AlphaDep(dep) {
  return dep.startsWith("@aws-cdk/") && dep.endsWith("-alpha");
}

function isCdkV1Dep(dep) {
  return dep.startsWith("@aws-cdk/") && !dep.endsWith("-alpha");
}
