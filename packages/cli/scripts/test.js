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

const jest = require("jest");
let argv = process.argv.slice(2);

const createJestConfig = require("./util/createJestConfig");
const path = require("path");
const paths = require("./util/paths");

const configPassed = argv.some(a => ["--config", "-c"].includes(a));
if (!configPassed) {
  argv.push(
    "--config",
    JSON.stringify(
      createJestConfig(
        (relativePath) => path.resolve(__dirname, "..", relativePath),
        path.resolve(paths.appPath)
      )
    )
  );
}


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
