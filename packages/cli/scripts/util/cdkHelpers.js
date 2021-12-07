/* eslint-disable */
"use strict";

const path = require("path");
const util = require("util");
const fs = require("fs-extra");
const chalk = require("chalk");
const esbuild = require("esbuild");
const spawn = require("cross-spawn");
const sstCore = require("@serverless-stack/core");
const { Stacks } = require("@serverless-stack/core");
const exec = util.promisify(require("child_process").exec);

const paths = require("./paths");
const array = require("../../lib/array");

const logger = sstCore.logger;

const buildDir = path.join(paths.appBuildPath, "lib");
const tsconfig = path.join(paths.appPath, "tsconfig.json");
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

function isDotnetRuntime(runtime) {
  return runtime.startsWith("dotnetcore");
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

async function loadEsbuildConfigOverrides(customConfig) {
  // Handle deprecated string format
  customConfig = JSON.parse(JSON.stringify(customConfig || {}));
  // note: "esbuildConfig" used to take a string, a path to the user
  //       provided config file. With the new format, esbuildConfig is
  //       configured inline, and the external file can only be used
  //       to return "plugins" field.
  if (typeof customConfig === "string") {
    customConfig = { plugins: customConfig };
  }

  // Validate fields
  const disallowedKey = Object.keys(customConfig).find(
    (key) => !["define", "keepNames", "plugins"].includes(key)
  );
  if (disallowedKey) {
    throw new Error(
      `Cannot configure the "${disallowedKey}" option in "bundle.esbuildConfig". Only "define", "keepNames", and "plugins" options are currently supported.`
    );
  }

  // Handle loading plugins
  if (customConfig.plugins) {
    // validate custom esbuild plugins path
    customConfig.plugins = path.join(paths.appPath, customConfig.plugins);
    if (!fs.existsSync(customConfig.plugins)) {
      throw new Error(
        `Cannot find the esbuild config file at "${customConfig.plugins}"`
      );
    }
    // load plugins config from external file
    const ret = require(customConfig.plugins);
    const nonPluginsKey = Object.keys(ret).find((key) => key !== "plugins");
    if (nonPluginsKey) {
      throw new Error(
        `Cannot configure the "${nonPluginsKey}" option in "${customConfig.plugins}". Only the "plugins" option is currently supported.`
      );
    }
    customConfig.plugins = ret.plugins;
  }

  return customConfig;
}

function parseLintOutput(output) {
  const ret = output.match(/problems? \((\d+) errors?, (\d+) warnings?\)/);
  return ret
    ? { errorCount: parseInt(ret[1]), warningCount: parseInt(ret[2]) }
    : { errorCount: 1 };
}

function parseTypeCheckOutput(output) {
  const ret = output.match(/Found (\d+) errors?./);
  return ret ? { errorCount: parseInt(ret[1]) } : { errorCount: 1 };
}

//////////////////////
// Prepare CDK function
//////////////////////

async function prepareCdk(_argv, _cliInfo, config) {
  logger.info(chalk.grey("Preparing your SST app"));

  await writeConfig(config);

  await copyConfigFiles();
  await copyWrapperFiles();

  Stacks.build(paths.appPath, config);
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
  const isTs = await checkFileExists(tsconfig);
  const appPackageJson = await getAppPackageJson();
  const external = getExternalModules(appPackageJson);

  runCdkVersionMatch(appPackageJson, cliInfo);

  if (isTs) {
    logger.info(chalk.grey("Detected tsconfig.json"));
  }

  // Get custom esbuild config
  const esbuildConfigOverrides = config.esbuildConfig
    ? await loadEsbuildConfigOverrides(config.esbuildConfig)
    : {};

  const metafile = path.join(buildDir, ".esbuild.json");
  const entryPoint = path.join(paths.appPath, config.main);

  if (!(await checkFileExists(entryPoint))) {
    throw new Error(
      `\nCannot find app handler. Make sure to add a "${config.main}" file.\n`
    );
  }

  logger.info(chalk.grey("Transpiling source"));

  esbuildOptions = {
    external,
    metafile: true,
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
    ...esbuildConfigOverrides,
  };

  try {
    const result = await esbuild.build(esbuildOptions);
    require("fs").writeFileSync(metafile, JSON.stringify(result.metafile));
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

async function lint(inputFiles) {
  inputFiles = inputFiles.filter(
    (file) =>
      file.indexOf("node_modules") === -1 &&
      (file.endsWith(".ts") || file.endsWith(".js"))
  );

  logger.info(chalk.grey("Linting source"));

  return new Promise((resolve, reject) => {
    let output = "";
    const cp = spawn(
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
      { stdio: "pipe", cwd: paths.ownPath }
    );
    cp.stdout.on("data", (data) => {
      data = data.toString();
      output += data.endsWith("\n") ? data : `${data}\n`;
      process.stdout.write(data);
    });
    cp.stderr.on("data", (data) => {
      data = data.toString();
      output += data.endsWith("\n") ? data : `${data}\n`;
      process.stderr.write(data);
    });
    cp.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error("There was a problem linting the source."));
      }
    });
  });
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

//////////////////////
// Deploy functions //
//////////////////////

async function getStaticSiteEnvironmentOutput() {
  // ie. environments outputs
  // [{
  //    id: "MyFrontend",
  //    path: "src/sites/react-app",
  //    stack: "dev-playground-another",
  //    environmentOutputs: {
  //      "REACT_APP_API_URL":"FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C",
  //      "ABC":"FrontendSSTSTATICSITEENVABC527391D2"
  //    }
  // }]
  const environmentDataPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "static-site-environment-output-keys.json"
  );
  return (await checkFileExists(environmentDataPath))
    ? await fs.readJson(environmentDataPath)
    : [];
}

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
  await printDeployResults(stackStates, cdkOptions);

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
    errorMessage: stackState.errorMessage,
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
async function printDeployResults(stackStates) {
  const environmentData = await getStaticSiteEnvironmentOutput();

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

      // If this stack failed to deploy or other stacks failed before this stack
      // started the deploying, then "outputs" is undefined. Skip printing outputs.
      if (!outputs) {
        return;
      }

      // Print stack outputs
      const filteredKeys = filterOutputKeys(
        environmentData,
        name,
        outputs,
        exports
      );
      if (filteredKeys.length > 0) {
        logger.info("  Outputs:");
        filteredKeys
          .sort(array.getCaseInsensitiveStringSorter())
          .forEach((name) => logger.info(`    ${name}: ${outputs[name]}`));
      }

      // Print StaticSite environment outputs
      environmentData
        .filter(({ stack }) => stack === name)
        .forEach(({ id, environmentOutputs }) => {
          logger.info(`  ${id}:`);
          Object.keys(environmentOutputs)
            .sort(array.getCaseInsensitiveStringSorter())
            .forEach((name) =>
              logger.info(`    ${name}: ${outputs[environmentOutputs[name]]}`)
            );
        });

      // Print stack exports
      if (Object.keys(exports || {}).length > 0) {
        logger.info("  Exports:");
        Object.keys(exports)
          .sort(array.getCaseInsensitiveStringSorter())
          .forEach((name) => logger.info(`    ${name}: ${exports[name]}`));
      }
    }
  );
  logger.info("");
}
function filterOutputKeys(environmentData, stackName, outputs, exports) {
  // Filter out
  // - CDK exported outputs; and
  // - StaticSite environment outputs
  // This is b/c the output name looks long and ugly.
  return Object.keys(outputs).filter(
    (outputName) =>
      !filterOutputKeys_isStaticSiteEnv(
        environmentData,
        stackName,
        outputName
      ) && !filterOutputKeys_isCfnOutput(stackName, outputName, exports)
  );
}
function filterOutputKeys_isCfnOutput(stackName, outputName, exports) {
  // 2 requirements:
  // - Output starts with "ExportsOutput"
  // - Also has an export with name "$stackName:$outputName"
  return (
    outputName.startsWith("ExportsOutput") &&
    Object.keys(exports || {}).includes(`${stackName}:${outputName}`)
  );
}
function filterOutputKeys_isStaticSiteEnv(
  environmentData,
  stackName,
  outputName
) {
  return environmentData.find(
    ({ stack, environmentOutputs }) =>
      stack === stackName &&
      Object.values(environmentOutputs).includes(outputName)
  );
}

async function writeOutputsFile(stacksData, outputsFileWithPath) {
  // This is native CDK option. According to CDK documentation:
  //    If an outputs file has been specified, create the file path and write stack
  //    outputs to it once. Outputs are written after all stacks have been deployed.
  //    If a stack deployment fails, all of the outputs from successfully deployed
  //    stacks before the failure will still be written.

  const environmentData = await getStaticSiteEnvironmentOutput();

  const stackOutputs = stacksData.reduce((acc, { name, outputs, exports }) => {
    // Filter Cfn Outputs
    const filteredOutputKeys = filterOutputKeys(
      environmentData,
      name,
      outputs,
      exports
    );
    const filteredOutputs = filteredOutputKeys.reduce((acc, outputName) => {
      return {
        ...acc,
        [outputName]: outputs[outputName],
      };
    }, {});

    if (filteredOutputKeys.length > 0) {
      return { ...acc, [name]: filteredOutputs };
    }
    return acc;
  }, {});

  fs.ensureFileSync(outputsFileWithPath);
  await fs.writeJson(outputsFileWithPath, stackOutputs, {
    spaces: 2,
    encoding: "utf8",
  });
}

module.exports = {
  diff,
  synth,
  deploy,
  destroyInit,
  destroyPoll,
  writeOutputsFile,

  // Exported for unit tests
  _filterOutputKeys: filterOutputKeys,

  prepareCdk,
  reTranspile,
  writeConfig,

  sleep,
  getTsBinPath,
  getCdkBinPath,
  getEsbuildTarget,
  checkFileExists,
  parseLintOutput,
  parseTypeCheckOutput,
  loadEsbuildConfigOverrides,

  isGoRuntime,
  isNodeRuntime,
  isDotnetRuntime,
  isPythonRuntime,
};
