#!/usr/bin/env bun

import { $ } from "bun";

import metafile from "../../../dist/metadata.json";
import artifacts from "../../../dist/artifacts.json";
import pkg from "../package.json";
const nextPkg = JSON.parse(JSON.stringify(pkg));
nextPkg.version = metafile.version;
nextPkg.optionalDependencies = nextPkg.optionalDependencies || {};

await $`bun run build`;

import fs from "fs/promises";
import path from "path";
const cpus = {
  arm64: "arm64",
  amd64: "x64",
  "386": "x86",
};

const tmp = `tmp`;
const dirs = [];
for (const artifact of artifacts) {
  if (artifact.type !== "Binary") continue;
  const os = artifact.goos;
  const cpu = cpus[artifact.goarch as keyof typeof cpus];
  if (!os || !cpu)
    throw new Error(`Invalid artifact: ${JSON.stringify(artifact)}`);
  const name = `${pkg.name}-${os}-${cpu}`;
  const dir = path.join(tmp, name);
  const binary = path.basename(artifact.path);
  await fs.mkdir(path.join(dir, "bin"), { recursive: true });
  await fs.cp(
    path.join("../../", artifact.path),
    path.join(dir, "bin", binary),
  );
  Bun.write(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        version: metafile.version,
        os: [os],
        cpu: [cpu],
        bin: {
          sst: path.join("bin", binary),
        },
      },
      null,
      2,
    ),
  );
  nextPkg.optionalDependencies[name] = metafile.version;
  dirs.push(dir);
}

try {
  for (const dir of dirs) {
    await $`cd ${dir} && npm publish --access public`;
  }
  console.log(nextPkg);
  await Bun.write("package.json", JSON.stringify(nextPkg, null, 2));
  // await $`npm publish --access public --tag ion`;
} finally {
  await Bun.write("package.json", JSON.stringify(pkg, null, 2));
  await fs.rmdir(tmp, { recursive: true });
}
