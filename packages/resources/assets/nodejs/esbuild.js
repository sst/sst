"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const esbuild = require("esbuild");

const parsedArgs = parseArgs(process.argv);

// Parse default config
if (!parsedArgs["--config"]) {
  throw new Error("--config parameter is required");
}
const defaultConfigValue = Buffer.from(parsedArgs["--config"], "base64");
const defaultConfig = JSON.parse(defaultConfigValue.toString("utf8"));

// Parse override config
const customConfigPath = parsedArgs["--overrides"];
const customConfig = customConfigPath ? require(customConfigPath) : {};
const nonPluginsKey = Object.keys(customConfig).find(
  (key) => key !== "plugins"
);
if (nonPluginsKey) {
  throw new Error(
    `Cannot configure the "${nonPluginsKey}" option in "${customConfigPath}". Only the "plugins" option is currently supported.`
  );
}

// Parse override config
const mergedConfig = {
  ...defaultConfig,
  ...customConfig,
};

esbuild.build(mergedConfig).catch(() => {
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
