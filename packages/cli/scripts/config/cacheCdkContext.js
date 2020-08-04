"use strict";

const fs = require("fs");
const path = require("path");

const paths = require("./paths");

module.exports = function () {
  const contextPath = path.join(paths.appBuildPath, "cdk.context.json");
  if (fs.existsSync(contextPath)) {
    fs.copyFileSync(contextPath, path.join(paths.appPath, "cdk.context.json"));
  }
};
