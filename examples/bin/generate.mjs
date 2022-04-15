#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import url from "url";
import cp from "cross-spawn";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const create = path.join(__dirname, "../../packages/create-sst/bin");

for (const example of await fs.readdir(path.join(create, "presets/examples"))) {
  console.log("Generating", example);
  cp.sync(`npx`, [`create-sst`, `examples/${example}`, example]);
  break;
}
