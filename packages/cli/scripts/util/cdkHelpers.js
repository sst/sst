"use strict";

const path = require("path");
const util = require("util");
const fs = require("fs-extra");
const chalk = require("chalk");
const crypto = require("crypto");
const esbuild = require("esbuild");
const spawn = require("cross-spawn");
const sstCore = require("@serverless-stack/core");
const exec = util.promisify(require("child_process").exec);

const paths = require("./paths");
const array = require("../../lib/array");

const logger = sstCore.logger;

const buildDir = path.join(paths.appBuildPath, "lib");
const tsconfig = path.join(paths.appPath, "tsconfig.json");
const cachePath = path.join(paths.appBuildPath, "sst-start-cache.json");
let esbuildOptions;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGoRuntime(runtime) {
  return runtime.startsWith("go");
}

function isNodeRuntime(runtime) {
  return runtime.startsWith("nodejs");
}

function isPythonRuntime(runtime) {
  return runtime.startsWith("python");
}

async function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

function getEsbuildTarget() {
  return "node" + process.version.slice(1);
}

/**
 * Finds the path to the tsc package executable by converting the file path of:
 * /Users/spongebob/serverless-stack/node_modules/typescript/dist/index.js
 * to:
 * /Users/spongebob/serverless-stack/node_modules/.bin/tsc
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

function getCdkBinPath() {
  const pkg = "aws-cdk";
  const filePath = require.resolve(pkg);
  const matches = filePath.match(/(^.*[/\\]node_modules)[/\\].*$/);

  if (matches === null || !matches[1]) {
    throw new Error(`There was a problem finding ${pkg}`);
  }

  return path.join(matches[1], ".bin", "cdk");
}

async function getAppPackageJson() {
  const srcPath = paths.appPackageJson;

  try {
    return await fs.readJson(srcPath);
  } catch (e) {
    throw new Error(`No valid package.json found in ${srcPath}`);
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
    throw new Error("\nThere was a problem reading the build metafile.\n");
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

//////////////////////
// Prepare CDK function
//////////////////////

async function prepareCdk(argv, cliInfo, config) {
  logger.info(chalk.grey("Preparing your SST app"));

  await writeConfig(config);

  await copyConfigFiles();
  await copyWrapperFiles();

  const inputFiles = await transpile(cliInfo, config);

  await runChecks(config, inputFiles);

  return { inputFiles };
}

async function writeConfig(config) {
  await fs.writeJson(path.join(paths.appBuildPath, "sst-merged.json"), config);
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

async function transpile(cliInfo, config) {
  let extension = "js";

  const isTs = await checkFileExists(tsconfig);
  const appPackageJson = await getAppPackageJson();
  const external = getExternalModules(appPackageJson);

  runCdkVersionMatch(appPackageJson, cliInfo);

  if (isTs) {
    extension = "ts";
    logger.info(chalk.grey("Detected tsconfig.json"));
  }

  // Get custom esbuild config
  let esbuildConfigOverrides = {};
  if (config.esbuildConfig) {
    const customConfigPath = path.join(paths.appPath, config.esbuildConfig);
    if (!await checkFileExists(customConfigPath)) {
      throw new Error(`Cannot find the esbuild config file at "${customConfigPath}"`);
    }
    esbuildConfigOverrides = require(customConfigPath);
  }

  const metafile = path.join(buildDir, ".esbuild.json");
  const entryPoint = path.join(paths.appLibPath, `index.${extension}`);

  if (!(await checkFileExists(entryPoint))) {
    throw new Error(
      `\nCannot find app handler. Make sure to add a "lib/index.${extension}" file.\n`
    );
  }

  logger.info(chalk.grey("Transpiling source"));

  esbuildOptions = {
    external,
    metafile,
    bundle: true,
    format: "cjs",
    sourcemap: true,
    platform: "node",
    outdir: buildDir,
    logLevel: process.env.DEBUG ? "warning" : "error",
    entryPoints: [entryPoint],
    target: [getEsbuildTarget()],
    tsconfig: isTs ? tsconfig : undefined,
    color: process.env.NO_COLOR !== "true",
    ...esbuildConfigOverrides
  };

  try {
    await esbuild.build(esbuildOptions);
  } catch (e) {
    // Not printing to screen because we are letting esbuild print
    // the error directly
    logger.debug(e);
    throw new Error("There was a problem transpiling the source.");
  }

  return await getInputFilesFromEsbuildMetafile(metafile);
}
async function reTranspile() {
  await esbuild.build(esbuildOptions);
  const metafile = path.join(buildDir, ".esbuild.json");
  return await getInputFilesFromEsbuildMetafile(metafile);
}

function runChecks(appliedConfig, inputFiles) {
  const promises = [];

  if (appliedConfig.lint) {
    promises.push(lint(inputFiles));
  }

  if (appliedConfig.typeCheck) {
    promises.push(typeCheck(inputFiles));
  }

  return Promise.all(promises);
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
    // Using the ownPath instead of the appPath because there are cases
    // where npm flattens the dependecies and this casues eslint to be
    // unable to find the parsers and plugins. The ownPath hack seems
    // to fix this issue.
    // https://github.com/serverless-stack/serverless-stack/pull/68
    // Steps to replicate, repo: https://github.com/jayair/sst-eu-example
    // Do `yarn add standard -D` and `sst build`
    { stdio: "inherit", cwd: paths.ownPath }
  );

  if (response.error) {
    logger.info(response.error);
    throw new Error("There was a problem linting the source.");
  } else if (response.stderr) {
    logger.info(response.stderr);
    throw new Error("There was a problem linting the source.");
  } else if (response.status === 1) {
    throw new Error("There was a problem linting the source.");
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
    throw new Error("There was a problem type checking the source.");
  }
}

//////////////////////
// CDK command wrappers
//////////////////////

function diff(cdkOptions, stackNames) {
  return sstCore.diff(cdkOptions, stackNames);
}

function synth(cdkOptions) {
  return sstCore.synth(cdkOptions);
}

function destroyInit(cdkOptions, stackName) {
  return sstCore.destroyInit(cdkOptions, stackName);
}

function destroyPoll(cdkOptions, stackStates) {
  return sstCore.destroyPoll(cdkOptions, stackStates);
}

function loadCache() {
  let cacheData;

  // If cache file does not exist or is invalid JSON, default to {}
  try {
    cacheData = fs.readJsonSync(cachePath);
  } catch (e) {
    cacheData = {};
  }

  return cacheData;
}
function updateCache(cacheData) {
  fs.writeJsonSync(cachePath, cacheData);
}
function generateStackChecksums(cdkManifest, cdkOutPath) {
  const checksums = {};
  cdkManifest.stacks.forEach(({ name }) => {
    const templatePath = path.join(cdkOutPath, `${name}.template.json`);
    checksums[name] = generateChecksum(templatePath);
  });
  return checksums;
}
function generateChecksum(templatePath) {
  const templateFile = fs.readFileSync(templatePath);
  const hash = crypto.createHash("sha1");
  hash.setEncoding("hex");
  hash.write(templateFile);
  hash.end();
  return hash.read();
}

//////////////////////
// Deploy functions //
//////////////////////

async function deploy(cdkOptions, stackName) {
  logger.info(chalk.grey("Deploying " + (stackName ? stackName : "stacks")));

  // Initialize deploy
  let { stackStates, isCompleted } = await deployInit(cdkOptions, stackName);

  // Loop until deploy is complete
  do {
    // Get CFN events before update
    const prevEventCount = getDeployEventCount(stackStates);

    // Update deploy status
    const response = await deployPoll(cdkOptions, stackStates);
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!isCompleted) {
      // Get CFN events after update. If events count did not change, we need to print out a
      // message to let users know we are still checking.
      const currEventCount = getDeployEventCount(stackStates);
      if (currEventCount === prevEventCount) {
        logger.info("Checking deploy status...");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  // Print deploy result
  printDeployResults(stackStates);

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
    outputs: stackState.outputs,
    exports: stackState.exports,
  }));
}
function deployInit(cdkOptions, stackName) {
  return sstCore.deployInit(cdkOptions, stackName);
}
function deployPoll(cdkOptions, stackStates) {
  return sstCore.deployPoll(cdkOptions, stackStates);
}
function printDeployResults(stackStates) {
  stackStates.forEach(
    ({ name, status, errorMessage, errorHelper, outputs, exports }) => {
      logger.info(`\nStack ${name}`);
      logger.info(`  Status: ${formatStackDeployStatus(status)}`);
      if (errorMessage) {
        logger.info(`  Error: ${errorMessage}`);
      }
      if (errorHelper) {
        logger.info(`  Helper: ${errorHelper}`);
      }

      if (Object.keys(outputs || {}).length > 0) {
        logger.info("  Outputs:");
        Object.keys(outputs)
          .sort(array.getCaseInsensitiveStringSorter())
          .forEach((name) =>
            logger.info(`    ${name}: ${outputs[name]}`)
          );
      }

      if (Object.keys(exports || {}).length > 0) {
        logger.info("  Exports:");
        Object.keys(exports)
          .sort(array.getCaseInsensitiveStringSorter())
          .forEach((name) =>
            logger.info(`    ${name}: ${exports[name]}`)
          );
      }
    }
  );
  logger.info("");
}
function getDeployEventCount(stackStates) {
  return stackStates.reduce(
    (acc, stackState) => acc + (stackState.events || []).length,
    0
  );
}
function formatStackDeployStatus(status) {
  return {
    failed: "failed",
    succeeded: "deployed",
    unchanged: "no changes",
    skipped: "not deployed",
  }[status];
}

module.exports = {
  diff,
  synth,
  deploy,
  destroyInit,
  destroyPoll,
  printDeployResults,

  prepareCdk,
  reTranspile,
  writeConfig,

  loadCache,
  updateCache,
  generateStackChecksums,

  sleep,
  getTsBinPath,
  getCdkBinPath,
  getEsbuildTarget,
  checkFileExists,

  isGoRuntime,
  isNodeRuntime,
  isPythonRuntime,
};
