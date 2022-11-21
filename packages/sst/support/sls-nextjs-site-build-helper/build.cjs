"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");

// Throw error if user app does not have "@sls-next/lambda-at-edge"
let Builder;
try {
  Builder = require("@sls-next/lambda-at-edge").Builder;
} catch (e) {
  if (e.code === "MODULE_NOT_FOUND") {
    console.log(
      chalk.red(
        `\nError: You need to add @sls-next/lambda-at-edge as a dependency in your package.json. Read more about it here - https://docs.sst.dev/constructs/NextjsSite#nextjs-features\n`
      )
    );
    process.exit(1);
  }
  throw e;
}

const parsedArgs = parseArgs(process.argv);

// Parse default config
if (!parsedArgs["--path"]) {
  throw new Error("--path parameter is required");
}
if (!parsedArgs["--output"]) {
  throw new Error("--output parameter is required");
}
if (!parsedArgs["--config"]) {
  throw new Error("--config parameter is required");
}
const sitePath = parsedArgs["--path"];
const buildOutDir = parsedArgs["--output"];
const configValue = Buffer.from(parsedArgs["--config"], "base64");
const config = JSON.parse(configValue.toString("utf8"));

const debugMode = true;
const builder = new Builder(sitePath, buildOutDir, config);
builder
  .build(debugMode)
  .then(() => {
    // wrap around the Lambda handler to add site environment placeholder
    const wrapperPath = path.join(__dirname, "index-wrapper.js");
    fs.copyFileSync(
      wrapperPath,
      path.join(buildOutDir, "default-lambda", "index-wrapper.js")
    );
    fs.copyFileSync(
      wrapperPath,
      path.join(buildOutDir, "api-lambda", "index-wrapper.js")
    );
    fs.copyFileSync(
      wrapperPath,
      path.join(buildOutDir, "image-lambda", "index-wrapper.js")
    );
    fs.copyFileSync(
      wrapperPath,
      path.join(buildOutDir, "regeneration-lambda", "index-wrapper.js")
    );
  })
  .catch((e) => {
    console.log("");
    console.error(e);
    console.log("");
    process.exit(1);
  });

function parseArgs(arrArgs) {
  return arrArgs.slice(2).reduce((acc, key, ind, self) => {
    if (key.startsWith("--")) {
      if (self[ind + 1] && self[ind + 1].startsWith("-")) {
        acc[key] = null;
      } else if (self[ind + 1]) {
        acc[key] = self[ind + 1];
      } else if (!self[ind + 1]) {
        acc[key] = null;
      }
    }
    return acc;
  }, {});
}
