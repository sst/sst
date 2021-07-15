//eslint-disable
"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const esbuild = require("esbuild");
const fs = require("fs");

const parsedArgs = parseArgs(process.argv);

if (!parsedArgs["--config"]) {
  throw new Error("--config parameter is required");
}

const configValue = Buffer.from(parsedArgs["--config"], "base64");
const config = JSON.parse(configValue.toString("utf8"));

const overrides = fs.existsSync(parsedArgs["--overrides"])
  ? require(parsedArgs["--overrides"])
  : {};

const mergedConfig = {
  ...config,
  ...overrides,
};

console.log(JSON.stringify(mergedConfig, null, 2));

esbuild
  .build(mergedConfig)
  .then(() => {
    console.info("Esbuild successful");
  })
  .catch((error) => {
    console.error("Esbuild failed", error);
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
