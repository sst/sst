"use strict";

const path = require("path");
const fs = require("fs-extra");
const spawn = require("cross-spawn");

const paths = require("./paths");

const DEFAULT_NAME = "";
const DEFAULT_STAGE = "dev";
const DEFAULT_REGION = "us-east-1";

function getCmdPath(cmd) {
  const appPath = path.join(paths.appNodeModules, ".bin", cmd);
  const ownPath = path.join(paths.ownNodeModules, ".bin", cmd);

  return fs.existsSync(appPath)
    ? appPath
    : // Fallback to own node modules, in case of tests that don't install the cli
      ownPath;
}

function createBuildPath() {
  fs.emptyDirSync(paths.appBuildPath);
}

function transpile() {
  let cmd;
  let args;
  let opts = { stdio: "inherit" };

  const tsconfigPath = path.join(paths.appPath, "tsconfig.json");

  if (fs.existsSync(tsconfigPath)) {
    cmd = getCmdPath("tsc");
    args = ["--outDir", paths.appBuildPath, "--rootDir", paths.appLibPath];
    opts = { stdio: "inherit", cwd: paths.appPath };
  } else {
    cmd = getCmdPath("babel");
    args = [
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
  const contextPath = path.join(paths.appBuildPath, "cdk.context.json");
  if (fs.existsSync(contextPath)) {
    fs.copyFileSync(contextPath, path.join(paths.appPath, "cdk.context.json"));
  }
}

module.exports = {
  prepareCdk,
  cacheCdkContext,
};
