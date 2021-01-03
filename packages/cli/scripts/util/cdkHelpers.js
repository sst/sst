"use strict";

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const spawn = require("cross-spawn");
const sstCore = require("@serverless-stack/core");

const paths = require("./paths");
const { logger } = require("../../lib/logger");
const { isSubProcessError } = require("../../lib/errors");

const isTs = fs.existsSync(path.join(paths.appPath, "tsconfig.json"));

const DEFAULT_STAGE = "dev";
const DEFAULT_NAME = "my-app";
const DEFAULT_REGION = "us-east-1";

function exitWithMessage(message, shortMessage) {
  shortMessage = shortMessage || message;

  // Formatted error to grep
  logger.debug(`SST Resources Error: ${shortMessage.trim()}`);

  // Move newline before message
  if (message.indexOf("\n") === 0) {
    logger.info("");
  }
  logger.error(message.trimStart());
  process.exit(1);
}

function getCmdPath(cmd) {
  const appPath = path.join(paths.appNodeModules, ".bin", cmd);
  const ownPath = path.join(paths.ownNodeModules, ".bin", cmd);

  // Fallback to own node modules, in case of tests that don't install the cli
  return fs.existsSync(appPath) ? appPath : ownPath;
}

function createBuildPath() {
  fs.emptyDirSync(paths.appBuildPath);
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

/**
 * Check if the user's app is using the exact version of the currently supported
 * AWS CDK version that Serverless Stack is using. If not, then show an error
 * message with update instructions.
 * More here
 *  - For TS: https://github.com/aws/aws-cdk/issues/542
 *  - For JS: https://github.com/aws/aws-cdk/issues/9578
 */
function runCdkVersionMatch(cliInfo) {
  const usingYarn = cliInfo.usingYarn;
  const helpUrl =
    "https://github.com/serverless-stack/serverless-stack#cdk-version-mismatch";

  const cdkVersion = cliInfo.cdkVersion;

  const appPackageJson = require(path.join(paths.appPath, "package.json"));
  const mismatchedDeps = filterMismatchedVersion(
    appPackageJson.dependencies,
    cdkVersion
  );
  const mismatchedDevDeps = filterMismatchedVersion(
    appPackageJson.devDependencies,
    cdkVersion
  );

  if (mismatchedDeps.length === 0 && mismatchedDevDeps.length === 0) {
    return;
  }

  logger.info("");
  logger.error(
    `Mismatched versions of AWS CDK packages. Serverless Stack currently supports ${chalk.bold(
      cdkVersion
    )}. Fix using:\n`
  );

  if (mismatchedDeps.length > 0) {
    const depString = formatDepsForInstall(mismatchedDeps, cdkVersion);
    logger.info(
      usingYarn
        ? `  yarn add ${depString} --exact`
        : `  npm install ${depString} --save-exact`
    );
  }
  if (mismatchedDevDeps.length > 0) {
    const devDepString = formatDepsForInstall(mismatchedDevDeps, cdkVersion);
    logger.info(
      usingYarn
        ? `  yarn add ${devDepString} --dev --exact`
        : `  npm install ${devDepString} --save-dev --save-exact`
    );
  }

  logger.info(`\nLearn more about it here — ${helpUrl}\n`);
}

function lint() {
  const config = isTs ? ".eslintrc.typescript.js" : ".eslintrc.babel.js";

  logger.info(chalk.grey("Linting source"));
  const results = spawn.sync(
    getCmdPath("eslint"),
    [
      "--no-error-on-unmatched-pattern",
      "--config",
      path.join(paths.ownPath, "scripts", "util", config),
      "--ext",
      ".js,.ts",
      "--fix",
      "lib/**",
      // Handling nested ESLint projects in Yarn Workspaces
      // https://github.com/serverless-stack/serverless-stack/issues/11
      "--resolve-plugins-relative-to",
      ".",
    ],
    { stdio: "inherit", cwd: paths.appPath }
  );

  if (results.error) {
    throw results.error;
  } else if (results.status !== 0) {
    process.exit(1);
  }
}

function transpile(cliInfo) {
  let cmd;
  let args;
  let opts = { stdio: "inherit" };

  runCdkVersionMatch(cliInfo);

  if (isTs) {
    logger.info(chalk.grey("Detected tsconfig.json"));
    logger.info(chalk.grey("Compiling TypeScript"));

    cmd = getCmdPath("tsc");
    args = ["--outDir", paths.appBuildPath, "--rootDir", paths.appLibPath];
    opts = { stdio: "inherit", cwd: paths.appPath };
  } else {
    logger.info(chalk.grey("Compiling with Babel"));

    cmd = getCmdPath("babel");
    args = [
      "--quiet",
      "--config-file",
      path.join(paths.appBuildPath, ".babelrc.json"),
      "--source-maps",
      "inline",
      paths.appLibPath,
      "--out-dir",
      paths.appBuildPath,
    ];
  }

  const results = spawn.sync(cmd, args, opts);

  if (results.error) {
    throw results.error;
  } else if (results.status !== 0) {
    exitWithMessage(
      // Add an empty line for Babel errors to make it more clear
      isTs ? "TypeScript compilation error" : "\nBabel compilation error"
    );
  }
}

function copyConfigFiles() {
  fs.copyFileSync(
    path.join(paths.ownPath, "assets", "cdk-wrapper", ".babelrc.json"),
    path.join(paths.appBuildPath, ".babelrc.json")
  );
}

function copyWrapperFiles() {
  fs.copyFileSync(
    path.join(paths.ownPath, "assets", "cdk-wrapper", "run.js"),
    path.join(paths.appBuildPath, "run.js")
  );
}

function applyConfig(argv) {
  const configPath = path.join(paths.appPath, "sst.json");

  if (!fs.existsSync(configPath)) {
    exitWithMessage(
      `\nAdd the ${chalk.bold(
        "sst.json"
      )} config file in your project root to get started. Or use the ${chalk.bold(
        "create-serverless-stack"
      )} CLI to create a new project.\n`
    );
  }

  let config;
  const configStr = fs.readFileSync(configPath, "utf8");

  try {
    config = JSON.parse(configStr);
  } catch (e) {
    exitWithMessage(
      `\nThere was a problem reading the ${chalk.bold(
        "sst.json"
      )} config file. Make sure it is in valid JSON format.\n`
    );
  }

  if (!config.type || config.type.trim() !== "@serverless-stack/resources") {
    exitWithMessage(
      `\nCannot detect the ${chalk.bold(
        "type"
      )} of Serverless Stack app. Make sure to set the following in your ${chalk.bold(
        "sst.json"
      )}.\n\n  "type": "@serverless-stack/resources"\n`,
      "Cannot detect the type of Serverless Stack app."
    );
  }

  if (!config.name || config.name.trim() === "") {
    exitWithMessage(
      `\nGive your Serverless Stack app a ${chalk.bold(
        "name"
      )} in the ${chalk.bold("sst.json")}.\n\n  "name": "my-sst-app"\n`,
      "Give your Serverless Stack app a name."
    );
  }

  config.name = config.name || DEFAULT_NAME;
  config.stage = argv.stage || config.stage || DEFAULT_STAGE;
  config.region = argv.region || config.region || DEFAULT_REGION;

  return config;
}

function writeConfig(config) {
  const type = config.type.trim();

  logger.info(chalk.grey(`Preparing ${type}`));

  fs.writeFileSync(
    path.join(paths.appBuildPath, "sst-merged.json"),
    JSON.stringify(config)
  );
}

function prepareCdk(argv, cliInfo, config) {
  let appliedConfig = config;

  createBuildPath();

  if (!config) {
    appliedConfig = applyConfig(argv);
  }

  writeConfig(appliedConfig);

  copyConfigFiles();
  copyWrapperFiles();

  lint();
  transpile(cliInfo);

  return appliedConfig;
}

function handleCdkErrors(e) {
  if (isSubProcessError(e)) {
    exitWithMessage("There was an error synthesizing your app.");
  } else {
    throw e;
  }
}

async function synth(options) {
  let results;

  try {
    results = await sstCore.synth(options);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function deploy(options) {
  let results;

  try {
    results = await sstCore.deploy(options);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function destroy(options) {
  let results;

  try {
    results = await sstCore.destroy(options);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function parallelDeploy(options, stackStates) {
  let results;

  try {
    results = await sstCore.parallelDeploy(options, stackStates);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function parallelDestroy(options, stackStates) {
  let results;

  try {
    results = await sstCore.parallelDestroy(options, stackStates);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

module.exports = {
  synth,
  deploy,
  destroy,
  prepareCdk,
  applyConfig,
  parallelDeploy,
  parallelDestroy,
};
