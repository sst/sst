"use strict";

const path = require("path");
const spawn = require("cross-spawn");

const paths = require("./config/paths");
const prepareCdk = require("./config/prepareCdk");

module.exports = function (argv) {
  // Prepare app
  prepareCdk(argv);

  const stackArgs = argv.stack ? [argv.stack] : [];

  // CDK destroy
  spawn.sync(
    path.join(paths.ownNodeModules, ".bin/cdk"),
    ["destroy"].concat(stackArgs),
    { stdio: "inherit", cwd: paths.appBuildPath }
  );
};
