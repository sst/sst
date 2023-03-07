"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const parsedArgs = parseArgs(process.argv);

// Parse default config
if (!parsedArgs["--path"]) {
  throw new Error("--path parameter is required");
}

const configPath = parsedArgs["--path"];

/*
type RemixConfig = {
  assetsBuildDirectory: string;
  publicPath: string;
  serverBuildPath: string;
  serverBuildTarget: string;
  server?: string;
};
*/

const configDefaults = {
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  serverBuildTarget: "node-cjs",
};

// Load config
const userConfig = require(configPath);
const config = {
  ...configDefaults,
  ...userConfig,
};

// Validate config
Object.keys(configDefaults).forEach((key) => {
  const k = key;
  if (config[k] !== configDefaults[k]) {
    console.log("");
    console.error(
      `RemixSite: remix.config.js "${key}" must be "${configDefaults[k]}".`
    );
    console.log("");
    process.exit(1);
  }
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
