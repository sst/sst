import esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import { Logger } from "../logger.js";
import { useBus } from "../bus.js";
import { useProject } from "../app.js";
import { dynamicImport } from "../util/module.js";

declare module "../bus.js" {
  export interface Events {
    "stack.built": {
      metafile: esbuild.Metafile;
    };
  }
}

export async function build() {
  const project = useProject();
  const bus = useBus();
  const pkg = JSON.parse(
    await fs
      .readFile(path.join(project.paths.root, "package.json"))
      .then((x) => x.toString())
  );
  const outfile = path.join(project.paths.out, `stacks.${Math.random()}.mjs`);

  Logger.debug("Running esbuild on", project.main, "to", outfile);
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
    absWorkingDir: project.paths.root,
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
    entryPoints: [project.main],
  });
  Logger.debug("Finished esbuild");

  Logger.debug("Sourcing stacks");
  try {
    const mod = await dynamicImport(outfile);
    Logger.debug("Finished sourcing stacks");
    await fs.rm(outfile, {
      force: true,
    });
    bus.publish("stack.built", {
      metafile: result.metafile,
    });
    return mod.default;
  } catch (e) {
    await fs.rm(outfile, {
      force: true,
    });
    throw e;
  }
}
