#!/usr/bin/env node

"use strict";

const path = require("path");
const fs = require("fs-extra");
const spawn = require("cross-spawn");
const argv = require("minimist")(process.argv.slice(2), { "--": true });

function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

function traverseDirectoriesToPath() {
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

async function maybeAwaitSstStart() {
  // If user passed in `--keepAlive`, use the specified value in seconds to wait on
  // `npx sst start` to initialize the `sst.json` file. Otherwise, fail quickly
  let keepAlive = argv.keepAlive ? parseInt(argv.keepAlive) : 1;

  let retries = 1;
  let path;
  do {
    if (retries % 5 === 0) {
      console.log(
        `sst-env: Waiting for sst.json to be created. Retry ${retries}`
      );
    }
    await sleep(1);
    path = traverseDirectoriesToPath();
    retries = retries + 1;
  } while (!path && retries <= keepAlive);

  return path;
}

// Get SST app path
maybeAwaitSstStart().then((sstAppPath) => {
  if (!sstAppPath) {
    console.error("sst-env: Cannot find an SST app in the parent directories");
    process.exit(1);
  }

  // Get environment outputs path
  const environmentOutputsPath = path.join(
    sstAppPath,
    ".build",
    "static-site-environment-output-values.json"
  );
  if (!fs.existsSync(environmentOutputsPath)) {
    console.error(
      `sst-env: Cannot find the SST outputs file in ${sstAppPath}. Make sure "sst start" is running.`
    );
    process.exit(1);
  }

  // Get environment
  const siteEnvironments = fs.readJsonSync(environmentOutputsPath);
  const environment = siteEnvironments.find(
    ({ path: sitePath }) => process.cwd() === path.resolve(sstAppPath, sitePath)
  );
  if (!environment) {
    console.error(
      `sst-env: Cannot find matching SST environment outputs in ${environmentOutputsPath}. Ensure the StaticSite points to ${process.cwd()}`
    );
    process.exit(1);
  }

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
});
