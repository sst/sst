"use strict";

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");
const spawn = require("cross-spawn");
const cdk = require("@serverless-stack/aws-cdk");

const paths = require("./paths");
const logger = require("../util/logger");
const { isSubProcessError } = require("../util/errors");

const DEFAULT_NAME = "";
const DEFAULT_STAGE = "dev";
const DEFAULT_REGION = "us-east-1";

function getCmdPath(cmd) {
  const appPath = path.join(paths.appNodeModules, ".bin", cmd);
  const ownPath = path.join(paths.ownNodeModules, ".bin", cmd);

  // Fallback to own node modules, in case of tests that don't install the cli
  return fs.existsSync(appPath) ? appPath : ownPath;
}

function createBuildPath() {
  fs.emptyDirSync(paths.appBuildPath);
}

function transpile() {
  let cmd;
  let args;
  let opts = { stdio: "inherit" };

  const tsconfigPath = path.join(paths.appPath, "tsconfig.json");
  const isTs = fs.existsSync(tsconfigPath);

  if (isTs) {
    logger.log(chalk.grey("Detected tsconfig.json"));
    logger.log(chalk.grey("Compiling TypeScript"));

    cmd = getCmdPath("tsc");
    args = ["--outDir", paths.appBuildPath, "--rootDir", paths.appLibPath];
    opts = { stdio: "inherit", cwd: paths.appPath };
  } else {
    logger.log(chalk.grey("Compiling with Babel"));

    cmd = getCmdPath("babel");
    args = [
      "--quiet",
      "--config-file",
      path.join(paths.ownPath, "scripts", "config", ".babelrc.json"),
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
    if (!isTs) {
      // Add an empty line for Babel errors to make it more clear
      console.log("");
    }
    logger.error(
      isTs ? "TypeScript compilation error" : "Babel compilation error"
    );
    process.exit(1);
  }
}

function copyWrapperFiles() {
  fs.copyFileSync(
    path.join(paths.ownScriptsPath, "wrapper", "run.js"),
    path.join(paths.appBuildPath, "run.js")
  );
}

function copyCdkConfig() {
  // Copy cdk.json
  fs.copyFileSync(
    path.join(paths.ownScriptsPath, "wrapper", "cdk.json"),
    path.join(paths.appBuildPath, "cdk.json")
  );
  // Copy cdk.context.json
  const contextPath = path.join(paths.appPath, "cdk.context.json");
  if (fs.existsSync(contextPath)) {
    fs.copyFileSync(
      contextPath,
      path.join(paths.appBuildPath, "cdk.context.json")
    );
  }
}

function applyConfig(argv) {
  const configPath = path.join(paths.appPath, "sst.json");
  const config = fs.existsSync(configPath) ? require(configPath) : {};

  config.name = config.name || DEFAULT_NAME;
  config.stage = argv.stage || config.stage || DEFAULT_STAGE;
  config.region = argv.region || config.region || DEFAULT_REGION;

  fs.writeFileSync(
    path.join(paths.appBuildPath, "sst-merged.json"),
    JSON.stringify(config)
  );

  return config;
}

function prepareCdk(argv) {
  createBuildPath();
  transpile();
  copyWrapperFiles();
  copyCdkConfig();
  return applyConfig(argv);
}

function cacheCdkContext() {
  logger.debug("Caching bootstrapped environment in context");

  const contextPath = path.join(paths.appBuildPath, "cdk.context.json");
  if (fs.existsSync(contextPath)) {
    fs.copyFileSync(contextPath, path.join(paths.appPath, "cdk.context.json"));
  }
}

async function synth() {
  let results;

  try {
    results = await cdk.sstSynth();
  } catch (e) {
    if (isSubProcessError(e)) {
      logger.error("There was an error synthesizing your app.");
      process.exit(1);
    }
  }

  return results;
}

async function deploy(stack) {
  try {
    await cdk.sstDeploy(stack);
  } catch (e) {
    if (isSubProcessError(e)) {
      logger.error("There was an error synthesizing your app.");
      process.exit(1);
    }
  }
}

async function destroy(stack) {
  try {
    await cdk.sstDestroy(stack);
  } catch (e) {
    if (isSubProcessError(e)) {
      logger.error("There was an error synthesizing your app.");
      process.exit(1);
    }
  }
}

module.exports = {
  synth,
  deploy,
  destroy,
  prepareCdk,
  cacheCdkContext,
};
