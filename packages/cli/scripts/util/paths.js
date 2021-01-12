/**
 * Based on https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/config/paths.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const resolveOwn = (relativePath) =>
  path.resolve(__dirname, "..", relativePath);

const appBuildDir = ".build";

module.exports = {
  appBuildDir,
  appPath: resolveApp("."),
  appLibPath: resolveApp("./lib"),
  appPackageJson: resolveApp("package.json"),
  appNodeModules: resolveApp("node_modules"),
  appBuildPath: resolveApp(`./${appBuildDir}`),

  ownPath: resolveOwn("../"),
  ownScriptsPath: resolveOwn("../scripts"),
  ownNodeModules: resolveOwn("../node_modules"),
};
