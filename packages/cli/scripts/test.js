/**
 * Based on https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/scripts/test.js
 */
"use strict";

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "test";
process.env.NODE_ENV = "test";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
  throw err;
});

const fs = require("fs");
const jest = require("jest");
const path = require("path");
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const paths = require("./util/paths");
const createJestConfig = require("./util/createJestConfig");

let argv = process.argv.slice(2);
argv.push(
  "--config",
  JSON.stringify(
    createJestConfig(
      (relativePath) => path.resolve(__dirname, "..", relativePath),
      path.resolve(paths.appPath)
    )
  )
);

// Load environment variables from dotenv
loadDotenv();

// This is a very dirty workaround for https://github.com/facebook/jest/issues/5913.
// We're trying to resolve the environment ourselves because Jest does it incorrectly.
// TODO: remove this as soon as it's fixed in Jest.
const resolve = require("resolve");
function resolveJestDefaultEnvironment(name) {
  const jestDir = path.dirname(
    resolve.sync("jest", {
      basedir: __dirname,
    })
  );
  const jestCLIDir = path.dirname(
    resolve.sync("jest-cli", {
      basedir: jestDir,
    })
  );
  const jestConfigDir = path.dirname(
    resolve.sync("jest-config", {
      basedir: jestCLIDir,
    })
  );
  return resolve.sync(name, {
    basedir: jestConfigDir,
  });
}
let cleanArgv = [];
let env = "jsdom";
let next;
do {
  next = argv.shift();
  if (next === "--env") {
    env = argv.shift();
  } else if (next.indexOf("--env=") === 0) {
    env = next.substring("--env=".length);
  } else {
    cleanArgv.push(next);
  }
} while (argv.length > 0);
argv = cleanArgv;
let resolvedEnv;
try {
  resolvedEnv = resolveJestDefaultEnvironment(`jest-environment-${env}`);
} catch (e) {
  // ignore
}
if (!resolvedEnv) {
  try {
    resolvedEnv = resolveJestDefaultEnvironment(env);
  } catch (e) {
    // ignore
  }
}
const testEnvironment = resolvedEnv || env;
argv.push("--env", testEnvironment);

jest.run(argv);

function loadDotenv() {
  [`.env.test`, `.env.local`, `.env`]
    .map((file) => path.join(paths.appPath, file))
    .filter((path) => fs.existsSync(path))
    .map((path) => {
      const result = dotenv.config({ path, debug: process.env.DEBUG });
      if (result.error) {
        console.error(`Failed to load environment variables from "${path}".`);
        console.error(result.error.message);
        process.exit(1);
      }
      return dotenvExpand(result);
    });
}
