/**
 * Based on https://github.com/aws/aws-cdk/blob/master/packages/cdk-assets/lib/private/archive.ts
 */
"use strict";

process.on("unhandledRejection", (err) => {
  throw err;
});

const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const archiver = require("archiver");
const glob = require("glob");

// Parse arguments
const argv = process.argv.slice(2);
const SITE_PATHS = argv[0];
const ZIP_PATH = argv[1];
const FILE_SIZE_LIMIT_IN_MB = argv[2];
const FILE_SIZE_LIMIT_IN_BYTES = FILE_SIZE_LIMIT_IN_MB * 1024 * 1024;

let output;
let archive;
let totalSize;
const statuses = [];
const allFiles = [];

generateZips().catch(() => {
  process.exit(1);
});

function generateZips() {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // Create the first zip file
    await openZip();

    // Loop through each folder need to be zipped
    for (const sitePath of SITE_PATHS.split(",")) {
      const files = getFilesInPath(sitePath);

      // Append files serially to ensure file order
      for (const file of files) {
        const fullPath = path.join(sitePath, file);
        const [data, stat] = await Promise.all([
          fs.readFile(fullPath),
          fs.stat(fullPath),
        ]);

        // Validate single file size cannot be greater than filesize limit
        const filesize = stat.size;
        if (filesize > FILE_SIZE_LIMIT_IN_BYTES) {
          throw new Error(
            `Cannot package file "${fullPath}". The file is larger than ${FILE_SIZE_LIMIT_IN_MB}MB.`
          );
        }

        // Create a new zip file if current filesize exceeds
        if (totalSize + filesize > FILE_SIZE_LIMIT_IN_BYTES) {
          await archive.finalize();
          await openZip();
        }

        archive.append(data, {
          name: file,
          date: new Date("1980-01-01T00:00:00.000Z"), // reset dates to get the same hash for the same content
          mode: stat.mode,
        });

        totalSize += filesize;
        allFiles.push(file);
      }
    }

    await archive.finalize();

    // Create a filenames file
    const filenamesPath = path.join(ZIP_PATH, `filenames`);
    await fs.writeFile(filenamesPath, allFiles.join("\n"));

    async function openZip() {
      const partId = statuses.length;
      const filePath = path.join(ZIP_PATH, `part${partId}.zip`);
      await fs.mkdir(path.dirname(filePath), {
        recursive: true,
      });
      output = fsSync.createWriteStream(filePath);
      archive = archiver("zip");
      (totalSize = 0), "w";
      statuses.push({
        output,
        archive,
        isOutputClosed: false,
      });

      archive.on("warning", reject);
      archive.on("error", reject);
      // archive has been finalized and the output file descriptor has closed, resolve promise
      // this has to be done before calling `finalize` since the events may fire immediately after.
      // see https://www.npmjs.com/package/archiver
      output.once("close", () => {
        statuses[partId].isOutputClosed = true;
        if (statuses.every(({ isOutputClosed }) => isOutputClosed)) {
          resolve();
        }
      });
      archive.pipe(output);
    }

    function getFilesInPath(sitePath) {
      // The below options are needed to support following symlinks when building zip files:
      // - nodir: This will prevent symlinks themselves from being copied into the zip.
      // - follow: This will follow symlinks and copy the files within.
      // The output here is already sorted
      return glob.sync("**", {
        dot: true,
        nodir: true,
        follow: true,
        cwd: sitePath,
      });
    }
  });
}
