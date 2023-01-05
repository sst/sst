/**
 * Based on https://github.com/aws/aws-cdk/blob/master/packages/cdk-assets/lib/private/archive.ts
 */
"use strict";

process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs")
const archiver = require("archiver");

// Parse arguments
const argv = process.argv.slice(2);
const SITE_PATH = argv[0];
const ZIP_PATH = argv[1];

generateZips().catch(() => {
  process.exit(1);
});

function generateZips() {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (ok, fail) => {
    let output;
    let archive;

    await fs.mkdir(path.dirname(ZIP_PATH), {
      recursive: true
    })
    output = fsSync.createWriteStream(ZIP_PATH);
    archive = archiver("zip");

    archive.on("warning", fail);
    archive.on("error", fail);
    // archive has been finalized and the output file descriptor has closed, resolve promise
    // this has to be done before calling `finalize` since the events may fire immediately after.
    // see https://www.npmjs.com/package/archiver
    output.once("close", () => {
      ok();
    });
    archive.pipe(output);

    //archive.directory(SITE_PATH, false);
    archive.glob("**", { cwd: SITE_PATH, dot: true,  });

    await archive.finalize();
  });
}
