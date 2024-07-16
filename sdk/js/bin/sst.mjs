#!/usr/bin/env node
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import path from "path";
import { execFileSync } from "child_process" 
const name = `sst-${process.platform}-${process.arch}`;
const binary = process.platform === "win32" ? "sst.exe" : "sst";

let resolved;
try {
  resolved = require.resolve(path.join(name, "bin", binary));
} catch (ex) {
  console.error(
    `It seems that your package manager failed to install the right version of the SST CLI for your platform. You can try manually installing the "${name}" package.`,
  );
  process.exit(1);
}

try {
  execFileSync(resolved, process.argv.slice(2),
    {
    stdio: "inherit", 
  })
} catch (ex) {
  process.exit(1)
} 

