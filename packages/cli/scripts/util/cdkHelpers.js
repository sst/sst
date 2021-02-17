"use strict";

const path = require("path");
const util = require("util");
const fs = require("fs-extra");
const chalk = require("chalk");
const esbuild = require("esbuild");
const spawn = require("cross-spawn");
const sstCore = require("@serverless-stack/core");
const exec = util.promisify(require("child_process").exec);

const paths = require("./paths");
const { isSubProcessError } = require("../../lib/errors");

const logger = sstCore.logger;

const buildDir = path.join(paths.appBuildPath, "lib");
const tsconfig = path.join(paths.appPath, "tsconfig.json");

const DEFAULT_STAGE = "dev";
const DEFAULT_NAME = "my-app";
const DEFAULT_REGION = "us-east-1";

async function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

/**
 * Finds the path to the tsc package executable by converting the file path of:
 * /Users/spongebob/serverless-stack-toolkit/node_modules/typescript/dist/index.js
 * to:
 * /Users/spongebob/serverless-stack-toolkit/node_modules/.bin/tsc
 */
function getTsBinPath() {
  const pkg = "typescript";
  const filePath = require.resolve(pkg);
  const matches = filePath.match(/(^.*[/\\]node_modules)[/\\].*$/);

  if (matches === null || !matches[1]) {
    throw new Error(`There was a problem finding ${pkg}`);
  }

  return path.join(matches[1], ".bin", "tsc");
}

function exitWithMessage(message, shortMessage) {
  shortMessage = shortMessage || message;

  // Formatted error to grep
  logger.debug(`SST Error: ${shortMessage.trim()}`);

  // Move newline before message
  if (message.indexOf("\n") === 0) {
    logger.info("");
  }
  logger.error(message.trimStart());

  process.exit(1);
}

async function getAppPackageJson() {
  const srcPath = paths.appPackageJson;

  try {
    return await fs.readJson(srcPath);
  } catch (e) {
    exitWithMessage(`No valid package.json found in ${srcPath}`);
  }
}

function getExternalModules(packageJson) {
  return Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
    ...(packageJson.peerDependencies || {}),
  });
}

async function getInputFilesFromEsbuildMetafile(file) {
  let metaJson;

  try {
    metaJson = await fs.readJson(file);
  } catch (e) {
    logger.debug(e);
    exitWithMessage("\nThere was a problem reading the build metafile.\n");
  }

  return Object.keys(metaJson.inputs).map((input) => path.resolve(input));
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
function runCdkVersionMatch(packageJson, cliInfo) {
  const usingYarn = cliInfo.usingYarn;
  const helpUrl =
    "https://github.com/serverless-stack/serverless-stack#cdk-version-mismatch";

  const cdkVersion = cliInfo.cdkVersion;

  const mismatchedDeps = filterMismatchedVersion(
    packageJson.dependencies,
    cdkVersion
  );
  const mismatchedDevDeps = filterMismatchedVersion(
    packageJson.devDependencies,
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

async function lint(inputFiles) {
  inputFiles = inputFiles.filter(
    (file) =>
      file.indexOf("node_modules") === -1 &&
      (file.endsWith(".ts") || file.endsWith(".js"))
  );

  logger.info(chalk.grey("Linting source"));

  const response = spawn.sync(
    "node",
    [
      path.join(paths.appBuildPath, "eslint.js"),
      process.env.NO_COLOR === "true" ? "--no-color" : "--color",
      ...inputFiles,
    ],
    { stdio: "inherit", cwd: paths.ownPath }
  );

  if (response.error) {
    logger.info(response.error);
    exitWithMessage("There was a problem linting the source.");
  } else if (response.stderr) {
    logger.info(response.stderr);
    exitWithMessage("There was a problem linting the source.");
  } else if (response.status === 1) {
    exitWithMessage("There was a problem linting the source.");
  } else if (response.stdout) {
    logger.debug(response.stdout);
  }
}

async function typeCheck(inputFiles) {
  inputFiles = inputFiles.filter((file) => file.endsWith(".ts"));

  if (inputFiles.length === 0) {
    return;
  }

  logger.info(chalk.grey("Running type checker"));

  try {
    const { stdout, stderr } = await exec(
      [
        getTsBinPath(),
        "--pretty",
        process.env.NO_COLOR === "true" ? "false" : "true",
        "--noEmit",
      ].join(" "),
      { cwd: paths.appPath }
    );
    if (stdout) {
      logger.info(stdout);
    }
    if (stderr) {
      logger.info(stderr);
    }
  } catch (e) {
    if (e.stdout) {
      logger.info(e.stdout);
    } else if (e.stderr) {
      logger.info(e.stderr);
    } else {
      logger.info(e);
    }
    exitWithMessage("There was a problem type checking the source.");
  }
}

function runChecks(inputFiles) {
  return Promise.allSettled([lint(inputFiles), typeCheck(inputFiles)]);
}

async function transpile(cliInfo) {
  let extension = "js";

  const isTs = await checkFileExists(tsconfig);
  const appPackageJson = await getAppPackageJson();
  const external = getExternalModules(appPackageJson);

  runCdkVersionMatch(appPackageJson, cliInfo);

  if (isTs) {
    extension = "ts";
    logger.info(chalk.grey("Detected tsconfig.json"));
  }

  const metafile = path.join(buildDir, ".esbuild.json");
  const entryPoint = path.join(paths.appLibPath, `index.${extension}`);

  if (!(await checkFileExists(entryPoint))) {
    exitWithMessage(
      `\nCannot find app handler. Make sure to add a "lib/index.${extension}" file.\n`
    );
  }

  logger.info(chalk.grey("Transpiling source"));

  try {
    await esbuild.build({
      external,
      metafile,
      bundle: true,
      format: "cjs",
      sourcemap: true,
      platform: "node",
      outdir: buildDir,
      entryPoints: [entryPoint],
      tsconfig: isTs ? tsconfig : undefined,
      color: process.env.NO_COLOR !== "true",
    });
  } catch (e) {
    // Not printing to screen because we are letting esbuild print
    // the error directly
    logger.debug(e);
    exitWithMessage("There was a problem transpiling the source.");
  }

  return await getInputFilesFromEsbuildMetafile(metafile);
}

function copyConfigFiles() {
  // Copy this file because we need it in the Lambda build process as well
  return fs.copy(
    path.join(paths.ownPath, "assets", "cdk-wrapper", "eslint.js"),
    path.join(paths.appBuildPath, "eslint.js")
  );
}

function copyWrapperFiles() {
  return fs.copy(
    path.join(paths.ownPath, "assets", "cdk-wrapper", "run.js"),
    path.join(paths.appBuildPath, "run.js")
  );
}

async function applyConfig(argv) {
  const configPath = path.join(paths.appPath, "sst.json");

  if (!(await checkFileExists(configPath))) {
    exitWithMessage(
      `\nAdd the ${chalk.bold(
        "sst.json"
      )} config file in your project root to get started. Or use the ${chalk.bold(
        "create-serverless-stack"
      )} CLI to create a new project.\n`
    );
  }

  let config;

  try {
    config = await fs.readJson(configPath);
  } catch (e) {
    exitWithMessage(
      `\nThere was a problem reading the ${chalk.bold(
        "sst.json"
      )} config file. Make sure it is in valid JSON format.\n`
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

async function writeConfig(config) {
  logger.info(chalk.grey("Preparing your SST app"));

  await fs.writeJson(path.join(paths.appBuildPath, "sst-merged.json"), config);
}

async function prepareCdk(argv, cliInfo, config) {
  let appliedConfig = config;

  if (!config) {
    appliedConfig = await applyConfig(argv);
  }

  await writeConfig(appliedConfig);

  await copyConfigFiles();
  await copyWrapperFiles();

  const inputFiles = await transpile(cliInfo);

  await runChecks(inputFiles);

  return { config: appliedConfig, inputFiles };
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

async function deployInit(options, stackName) {
  let results;

  try {
    results = await sstCore.deployInit(options, stackName);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function deployPoll(options, stackStates) {
  let results;

  try {
    results = await sstCore.deployPoll(options, stackStates);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function destroyInit(options, stackName) {
  let results;

  try {
    results = await sstCore.destroyInit(options, stackName);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

async function destroyPoll(options, stackStates) {
  let results;

  try {
    results = await sstCore.destroyPoll(options, stackStates);
  } catch (e) {
    handleCdkErrors(e);
  }

  return results;
}

module.exports = {
  synth,
  deployInit,
  deployPoll,
  prepareCdk,
  destroyInit,
  destroyPoll,
  applyConfig,
  getTsBinPath,
};
