#!/usr/bin/env node

/**
 * Gets the forked AWS CDK version from @serverless-stack/core and makes sure:
 *  - The aws-cdk package used for the cdk command is the same version
 *  - All the package.json files in the tests are using the same version
 */

const path = require("path");
const replace = require("replace-in-file");

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
    "\n❌ The following AWS CDK packages in @serverless-stack/cli need to be updated to AWS CDK v2:\n"
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
    "\n❌ AWS CDK packages in @serverless-stack/cli are not in sync with @serverless-stack/core. Fix using:\n"
  );

  if (mismatchedDeps.length > 0) {
    const depString = formatDepsForInstall(mismatchedDeps, cdkVersion);
    console.log(`  yarn add ${depString} --exact`);
  }

  console.log("");
  process.exit(1);
}

console.log(
  "✅ AWS CDK packages in @serverless-stack/cli are in sync with @serverless-stack/core"
);

/////////////////////
// Check for tests
/////////////////////

try {
  const results = [];
  const patterns = [
    {
      from: /"(aws-cdk-lib)": "[^~]?(\d+\.\d+\.\d+)"/g,
      to: `"$1": "${cdkVersion}"`,
    },
    {
      from: /"(aws-cdk)": "[^~]?(\d+\.\d+\.\d+)"/g,
      to: `"$1": "${cdkVersion}"`,
    },
    {
      from: /"(@?aws-cdk.aws-.*-alpha)": "[^~]?(\d+\.\d+\.\d+-alpha\.\d)"/g,
      to: `"$1": "${cdkVersion}-alpha.0"`,
    },
  ];
  patterns.forEach(({ from, to }) => {
    // Replace pattern
    const ret = replace.sync({
      //dry     : true,
      files: "test/*/package.json",
      ignore: "test/mismatched-cdk-versions/package.json",
      from,
      to,
    });
    results.push(...ret);
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
