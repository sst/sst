"use strict";

const fs = require("fs");
const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./paths");

const DEFAULT_NAME = "";
const DEFAULT_STAGE = "dev";
const DEFAULT_REGION = "us-east-1";

function transpile() {
  const tsconfigPath = path.join(paths.appPath, "tsconfig.json");
  if (fs.existsSync(tsconfigPath)) {
    spawn.sync(
      path.join(paths.ownNodeModules, ".bin/tsc"),
      ["--outDir", paths.appBuildPath, "--rootDir", paths.appLibPath],
      { stdio: "inherit", cwd: paths.appPath }
    );
  } else {
    spawn.sync(
      path.join(paths.ownNodeModules, ".bin/babel"),
      [
        "--config-file",
        path.join(paths.ownPath, "scripts/config/.babelrc.json"),
        "--source-maps",
        "inline",
        paths.appLibPath,
        "--out-dir",
        paths.appBuildPath,
      ],
      { stdio: "inherit" }
    );
  }
}

function copyWrapperFiles() {
  fs.copyFileSync(
    path.join(paths.ownScriptsPath, "wrapper/run.js"),
    path.join(paths.appBuildPath, "run.js")
  );
}

function copyCdkConfig() {
  // Copy cdk.json
  fs.copyFileSync(
    path.join(paths.ownScriptsPath, "wrapper/cdk.json"),
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
