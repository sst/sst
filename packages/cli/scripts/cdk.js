"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

let argv = process.argv.slice(2);

import { sync } from "cross-spawn";

import { app } from "./util/cdkOptions.js";
import { getCdkBinPath } from "./util/cdkHelpers.js";

// CDK command
sync(getCdkBinPath(), ["--app", app].concat(argv), {
  stdio: "inherit",
});
