"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const { Builder } = require("@serverless-stack/nextjs-lambda");

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
builder.build(debugMode).catch(() => {
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
