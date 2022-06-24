import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import esbuild from "esbuild";
import * as sstCore from "@serverless-stack/core";
import { Stacks } from "@serverless-stack/core";
import paths from "./paths.mjs";
import array from "../../lib/array.mjs";

const logger = sstCore.logger;

const buildDir = path.join(paths.appBuildPath, "lib");
let esbuildOptions;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isGoRuntime(runtime) {
  return runtime.startsWith("go");
}

export function isNodeRuntime(runtime) {
  return runtime.startsWith("nodejs");
}

export function isDotnetRuntime(runtime) {
  return runtime.startsWith("dotnet");
}

export function isPythonRuntime(runtime) {
  return runtime.startsWith("python");
}

export async function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export function validatePropsForJs(config) {
  if (config.main.endsWith(".js")) {
    const errors = Stacks.check(paths.appPath, config);
    if (errors.length)
      console.log(Stacks.formatDiagnostics(errors).join("\n\n"));
  }
}

export function getEsbuildTarget() {
  return "node" + process.version.slice(1);
}

export function writePackageJson(dir) {
  // write package.json that marks the build dir scripts as being commonjs
  // better would be to use .cjs endings for the scripts or output ESM
  const buildPackageJsonPath = path.join(dir, "package.json");
  fs.writeFileSync(buildPackageJsonPath, JSON.stringify({ type: "module" }));
}

export async function getAppPackageJson() {
  const srcPath = paths.appPackageJson;

  try {
    return await fs.readJson(srcPath);
  } catch (e) {
    throw new Error(`No valid package.json found in ${srcPath}`);
  }
}

export function getExternalModules(packageJson) {
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

export async function prepareCdk(_argv, cliInfo, config) {
  logger.info(chalk.grey("Preparing your SST app"));

  writePackageJson(paths.appBuildPath);

  await writeConfig(config);
  await copyWrapperFiles();

  const appPackageJson = await getAppPackageJson();
  runCdkVersionMatch(appPackageJson, cliInfo);

  await Stacks.build(paths.appPath, config);
}

export async function writeConfig(config) {
  await fs.writeJson(path.join(paths.appBuildPath, "sst-merged.json"), config);
}
function copyWrapperFiles() {
  return fs.copy(
    path.join(paths.ownPath, "assets", "cdk-wrapper", "run.mjs"),
    path.join(paths.appBuildPath, "run.mjs")
  );
}

async function reTranspile() {
  await esbuild.build(esbuildOptions);
  const metafile = path.join(buildDir, ".esbuild.json");
  return await getInputFilesFromEsbuildMetafile(metafile);
}

//////////////////////
// Check CDK dep versions
//////////////////////

/**
 * Check if the user's app is using the exact version of the currently supported
 * AWS CDK version that SST is using. If not, then show an error
 * message with update instructions.
 * More here
 *  - For TS: https://github.com/aws/aws-cdk/issues/542
 *  - For JS: https://github.com/aws/aws-cdk/issues/9578
 */
function runCdkVersionMatch(packageJson, cliInfo) {
  const usingYarn = cliInfo.usingYarn;
  const cdkVersion = cliInfo.cdkVersion;

  // Check v1 dependencies
  const v1Deps = [
    ...getCdkV1Deps(packageJson.dependencies),
    ...getCdkV1Deps(packageJson.devDependencies),
  ];
  if (v1Deps.length > 0) {
    logger.error(
      `\n${chalk.red("Update the following AWS CDK packages to v2:")}\n`
    );
    v1Deps.forEach((dep) => logger.error(chalk.red(`  - ${dep}`)));
    logger.error(
      `\nMore details on upgrading to CDK v2: https://github.com/serverless-stack/sst/releases/tag/v0.59.0\n`
    );
    throw new Error(`AWS CDK packages need to be updated.`);
  }

  const mismatchedDeps = getCdkV2MismatchedDeps(
    packageJson.dependencies,
    cdkVersion
  );
  const mismatchedDevDeps = getCdkV2MismatchedDeps(
    packageJson.devDependencies,
    cdkVersion
  );

  if (mismatchedDeps.length === 0 && mismatchedDevDeps.length === 0) {
    return;
  }

  logger.info("");
  logger.error(
    `Mismatched versions of AWS CDK packages. SST currently supports ${chalk.bold(
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

  logger.info(
    `\nLearn more about it here — https://docs.sst.dev/known-issues\n`
  );
}

export function getCdkV1Deps(deps) {
  return Object.keys(deps || {}).filter(isCdkV1Dep);
}

export function getCdkV2MismatchedDeps(deps, cdkVersion) {
  return Object.keys(deps || {}).filter((key) => {
    const version = deps[key];
    if (isCdkV2CoreDep(key)) {
      return version !== cdkVersion;
    } else if (isCdkV2AlphaDep(key)) {
      return (
        !version.startsWith(`${cdkVersion}-alpha.`) &&
        !version.startsWith(`~${cdkVersion}-alpha.`)
      );
    }
    return false;
  });
}

function formatDepsForInstall(depsList, version) {
  return depsList
    .map((dep) =>
      isCdkV2CoreDep(dep) ? `${dep}@${version}` : `${dep}@${version}-alpha.0`
    )
    .join(" ");
}

export function isCdkV2CoreDep(dep) {
  return dep === "aws-cdk" || dep === "aws-cdk-lib";
}

export function isCdkV2AlphaDep(dep) {
  return dep.startsWith("@aws-cdk/") && dep.endsWith("-alpha");
}

export function isCdkV1Dep(dep) {
  return dep.startsWith("@aws-cdk/") && !dep.endsWith("-alpha");
}

//////////////////////
// CDK command wrappers
//////////////////////

export function diff(cdkOptions, stackNames) {
  return sstCore.diff(cdkOptions, stackNames);
}

export function synth(cdkOptions) {
  return sstCore.synth(cdkOptions);
}

export function destroyInit(cdkOptions, stackName) {
  return sstCore.destroyInit(cdkOptions, stackName);
}

export function destroyPoll(cdkOptions, stackStates) {
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

export async function deploy(cdkOptions, stackName) {
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
    id: stackState.id,
    name: stackState.name,
    region: stackState.region,
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
        .filter(
          ({ environmentOutputs }) => Object.keys(environmentOutputs).length > 0
        )
        .forEach(({ id, environmentOutputs }) => {
          logger.info(`  ${id}:`);
          Object.keys(environmentOutputs)
            .sort(array.getCaseInsensitiveStringSorter())
            .forEach((name) =>
              logger.info(`    ${name}: ${outputs[environmentOutputs[name]]}`)
            );
        });

      // Print stack exports
      const filteredExportNames = Object.keys(exports || {}).filter(
        (exportName) => {
          // filter exports from CDK outputs that are removed
          // ie. output: ExportsOutputRefApiCD79AAA0A1504A18
          //     export: dev-playground-api:ExportsOutputRefApiCD79AAA0A1504A18
          if (!exportName.startsWith(`${name}:`)) {
            return true;
          }
          const outputName = exportName.substring(name.length + 1);
          const isOutputRemoved =
            outputs[outputName] !== undefined &&
            !filteredKeys.includes(outputName);
          return !isOutputRemoved;
        }
      );
      if (filteredExportNames.length > 0) {
        logger.info("  Exports:");
        filteredExportNames
          .sort(array.getCaseInsensitiveStringSorter())
          .forEach((exportName) => {
            const exportValue = exports[exportName];
            logger.info(`    ${exportName}: ${exportValue}`);
          });
      }
    }
  );
  logger.info("");
}
export function filterOutputKeys(environmentData, stackName, outputs, exports) {
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

export async function writeOutputsFile(stacksData, outputsFileWithPath) {
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
