"use strict";

// Given we can't do synchronous dynamic imports within ESM we have to create
// this script so that our CDK construct can execute it synchronously and get
// the Remix config.

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const fs = require("fs-extra");
const chalk = require("chalk");
const { hashElement } = require("folder-hash");

function failWithError(msg) {
  console.error(chalk.red(msg));
  process.exit(1);
}

async function getFolderHash(dir, ignore) {
  if (!fs.existsSync(dir)) {
    failWithError(`Could not find directory at path "${dir}".`);
  }
  if (!fs.statSync(dir).isDirectory()) {
    failWithError(`Path "${dir}" is not a directory.`);
  }

  const { hash } = await hashElement(dir, {
    folders: {
      exclude: ignore ? [ignore] : undefined,
      matchBasename: true,
      matchPath: false,
      ignoreBasename: true,
    },
  });
  return hash;
}

const parsedArgs = parseArgs(process.argv);

// Parse default config
if (!parsedArgs["--path"]) {
  throw new Error("--path parameter is required");
}

getFolderHash(parsedArgs["--path"], parsedArgs["--ignore"]).then((hash) => {
  console.log(hash);
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
