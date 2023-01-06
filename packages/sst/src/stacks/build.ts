import esbuild from "esbuild";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { Logger } from "../logger.js";
import { useBus } from "../bus.js";
import { useProject } from "../project.js";
import { dynamicImport } from "../util/module.js";
import { findAbove } from "../util/fs.js";

declare module "../bus.js" {
  export interface Events {
    "stack.built": {
      metafile: esbuild.Metafile;
    };
  }
}

export async function load(input: string) {
  const parsed = path.parse(input);
  const root = await findAbove(input, "package.json");
  const outfile = path.join(parsed.dir, `${parsed.name}.${Date.now()}.mjs`);
  const pkg = JSON.parse(
    await fs.readFile(path.join(root, "package.json")).then((x) => x.toString())
  );
  const result = await esbuild.build({
    keepNames: true,
    bundle: true,
    sourcemap: "inline",
    platform: "node",
    target: "esnext",
    metafile: true,
    format: "esm",
    external: [
      "aws-cdk-lib",
      "sst",
      ...Object.keys({
        ...pkg.devDependencies,
        ...pkg.dependencies,
        ...pkg.peerDependencies,
      }),
    ],
    absWorkingDir: root,
    outfile,
    banner: {
      js: [
        `import { createRequire as topLevelCreateRequire } from 'module';`,
        `const require = topLevelCreateRequire(import.meta.url);`,
      ].join(""),
    },
    // The entry can have any file name (ie. "stacks/anything.ts"). We want the
    // build output to be always named "lib/index.js". This allow us to always
    // import from "buildDir" without needing to pass "anything" around.
    entryPoints: [input],
  });
  try {
    const mod = await dynamicImport(outfile);
    await fs.rm(outfile, {
      force: true,
    });
    return [result.metafile, mod.default] as const;
  } catch (e) {
    await fs.rm(outfile, {
      force: true,
    });
    throw e;
  }
}
