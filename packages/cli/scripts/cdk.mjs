"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

let argv = process.argv.slice(2);

import spawn from "cross-spawn";
import { getCdkBinPath } from "@serverless-stack/core";
import * as cdkOptions from "./util/cdkOptions.mjs";

// CDK command
const result = spawn.sync(
  "node",
  [getCdkBinPath(), "--app", cdkOptions.app].concat(argv),
  {
    stdio: "inherit",
  }
);

process.exit(result.status);
