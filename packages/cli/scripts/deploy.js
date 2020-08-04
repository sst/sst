"use strict";

const fs = require("fs");
const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./config/paths");
const prepareCdk = require("./config/prepareCdk");
const cacheCdkContext = require("./config/cacheCdkContext");

function cacheBootstrap(call) {
  if (call.status !== 0) {
    return;
  }

  const matches = call.stderr
    .toString("utf8")
    .match(/Environment (aws:\/\/\d+\/[a-z0-9-]+) bootstrapped/);

  if (matches === null) {
    return;
  }

  const environment = matches[1];

  const contextPath = path.join(paths.appBuildPath, "cdk.context.json");
  const context = fs.existsSync(contextPath) ? require(contextPath) : {};

  context.bootstrappedEnvs = context.bootstrappedEnvs || {};
  context.bootstrappedEnvs[environment] = true;

  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}

module.exports = function (argv) {
  // Prepare app
  prepareCdk(argv);

  // CDK bootstrap
  const bsCall = spawn.sync(
    path.join(paths.ownNodeModules, ".bin/cdk"),
    ["bootstrap", "--no-colors"],
    { cwd: paths.appBuildPath }
  );

  // Cache Bootstrap results
  cacheBootstrap(bsCall);

  const stackArgs = argv.stack ? [argv.stack] : [];

  // CDK deploy
  spawn.sync(
    path.join(paths.ownNodeModules, ".bin/cdk"),
    ["deploy"].concat(stackArgs),
    { stdio: "inherit", cwd: paths.appBuildPath }
  );

  // Cache cdk.context.json
  cacheCdkContext();
};
