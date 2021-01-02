/**
 * Copies the all the symlinks in root node_modules .bin dir to the current
 * node_modules/.bin dir with their proper paths.
 *
 * This is necessary because Yarn Workspaces doesn't install them and the SST
 * scripts need the eslint and tsc executables.
 */
const fs = require("fs");
const path = require("path");

const rootBin = path.join(__dirname, "../../../../node_modules", ".bin");

const files = fs.readdirSync(rootBin, {
  encoding: "utf8",
  withFileTypes: true,
});

files.forEach((file) => {
  if (file.isSymbolicLink()) {
    const name = file.name;
    const relPath = fs.readlinkSync(path.join(rootBin, name));
    const fullPath = path.join(rootBin, relPath);

    try {
      fs.symlinkSync(fullPath, path.join("node_modules", ".bin", name));
    } catch (e) {
      if (e.code !== "EEXIST") {
        throw e;
      }
    }
  }
});
