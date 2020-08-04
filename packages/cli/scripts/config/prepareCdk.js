"use strict";

const fs = require("fs");
const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./paths");

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
  fs.copyFileSync(
    path.join(paths.ownScriptsPath, "wrapper/dist/include.js"),
    path.join(paths.appBuildPath, "include.js")
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

function setOptions(argv) {
  const options = {};

  if (argv.stage) {
    options.stage = argv.stage;
  }

  if (argv.region) {
    options.region = argv.region;
  }

  fs.writeFileSync(
    path.join(paths.appBuildPath, "options.json"),
    JSON.stringify(options)
  );
}

module.exports = function (argv) {
  transpile();
  copyWrapperFiles();
  copyCdkConfig();
  setOptions(argv);
};
