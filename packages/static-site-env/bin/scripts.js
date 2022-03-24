#!/usr/bin/env node

"use strict";

const path = require("path");
const fs = require("fs-extra");
const spawn = require("cross-spawn");
const argv = require("minimist")(process.argv.slice(2), { "--": true });

async function main() {
  // Check SST app exists
  const sstAppPath = getSstAppPath();
  if (!sstAppPath) {
    console.error("Cannot find an SST app in the parent directories");
    process.exit(1);
  }

  // Wait for SST start
  const environmentOutputsPath = path.join(
    sstAppPath,
    ".build/static-site-environment-output-values.json"
  );
  await waitForEnvironmentOutputs(sstAppPath, environmentOutputsPath);

  // Load environment
  const siteEnvironments = fs.readJsonSync(environmentOutputsPath);
  const environment = siteEnvironments.find(
    ({ path: sitePath }) => process.cwd() === path.resolve(sstAppPath, sitePath)
  );

  if (!environment) {
    console.error(
      `Cannot find matching SST environment outputs in ${environmentOutputsPath}. Ensure the StaticSite points to ${process.cwd()}`
    );
    process.exit(1);
  }

  // Invoke script
  if (argv["--"] && argv["--"].length) {
    spawn(argv["--"][0], argv["--"].slice(1), {
      stdio: "inherit",
      env: {
        ...process.env,
        ...environment.environmentOutputs,
      },
    }).on("exit", function (exitCode) {
      process.exit(exitCode);
    });
  }
}

function getSstAppPath() {
  // If user passed in `--path`, use the specified path. Otherwise, traverse up
  // directory until finds `sst.json`
  let curPath = argv.path
    ? path.resolve(process.cwd(), argv.path)
    : process.cwd();
  do {
    if (fs.existsSync(path.join(curPath, "sst.json"))) {
      return path.resolve(curPath);
    }
    curPath = `${curPath}/..`;
  } while (path.resolve(curPath) !== path.resolve("/"));
}

async function waitForEnvironmentOutputs(sstAppPath, environmentOutputsPath) {
  // Periodically check environment file exists
  let retries = 0;

  while (!fs.existsSync(environmentOutputsPath)) {
    if (retries === 0) {
      console.log(`Waiting for SST to start in ${sstAppPath}...`);
    } else if (retries % 5 === 0) {
      console.log(`Waiting for SST to start...`);
    }
    await sleep(1);

    retries = retries + 1;
  }
}

function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

main();
