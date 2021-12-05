/**
 * Based on https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/config/paths.js
 */
"use strict";

import fs from "fs";
import path from "path";
import { dirname } from "dirname-filename-esm";
const __dirname = dirname(import.meta);

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const resolveOwn = (relativePath) =>
  path.resolve(__dirname, "..", relativePath);

const appBuildDir = ".build";

const appPath = resolveApp(".");
const appLibPath = resolveApp("./lib");
const appPackageJson = resolveApp("package.json");
const appNodeModules = resolveApp("node_modules");
const appBuildPath = resolveApp(`./${appBuildDir}`);

const ownPath = resolveOwn("../");
const ownScriptsPath = resolveOwn("../scripts");
const ownNodeModules = resolveOwn("../node_modules");

export {
  appBuildDir,
  appBuildPath,
  appDirectory,
  appLibPath,
  appNodeModules,
  appPackageJson,
  appPath,
  ownNodeModules,
  ownPath,
  ownScriptsPath,
};
