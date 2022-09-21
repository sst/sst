import { ProjectRoot, useConfig } from "../config/index.js";
import esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import { useState } from "../state/index.js";

export async function build() {
  import("aws-cdk-lib");
  const root = await ProjectRoot.use();
  const state = await useState();
  const config = await useConfig();
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, "package.json")).then(x => x.toString())
  );
  const outfile = path.join(state, `stacks.${Math.random()}.mjs`);

  await esbuild.build({
    keepNames: true,
    bundle: true,
    sourcemap: "inline",
    platform: "node",
    target: "esnext",
    format: "esm",
    external: [
      "aws-cdk-lib",
      "@serverless-stack/*",
      ...Object.keys({
        ...pkg.devDependencies,
        ...pkg.dependencies,
        ...pkg.peerDependencies
      })
    ],
    absWorkingDir: root,
    outfile,
    banner: {
      js: [
        `import { createRequire as topLevelCreateRequire } from 'module';`,
        `const require = topLevelCreateRequire(import.meta.url);`
      ].join("")
    },
    // The entry can have any file name (ie. "stacks/anything.ts"). We want the
    // build output to be always named "lib/index.js". This allow us to always
    // import from "buildDir" without needing to pass "anything" around.
    entryPoints: [config.main]
  });

  const mod = await import(outfile);
  await fs.rm(outfile, {
    force: true
  });
  return mod.default;
}
