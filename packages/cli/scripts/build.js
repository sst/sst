"use strict";

const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./config/paths");
const prepareCdk = require("./config/prepareCdk");
const cacheCdkContext = require("./config/cacheCdkContext");

module.exports = function (argv) {
  // Prepare app
  prepareCdk(argv);

  // CDK synth
  spawn.sync(path.join(paths.ownNodeModules, ".bin/cdk"), ["synth"], {
    stdio: "inherit",
    cwd: paths.appBuildPath,
  });

  // Cache cdk.context.json
  cacheCdkContext();
};
