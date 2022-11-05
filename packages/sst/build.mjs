import esbuild from "esbuild";
import fs from "fs/promises";
import { execSync } from "child_process";

const OUT = "./dist";
await fs.rm(OUT, { recursive: true });
const pkg = await fs.readFile("package.json").then(JSON.parse);
const watch = false;

const result = await esbuild.build({
  entryPoints: ["src/cli/sst.ts"],
  bundle: true,
  outdir: "dist",
  metafile: true,
  external: [
    ...Object.keys(pkg.dependencies),
    "kysely",
    "kysely-codegen",
    "./src/constructs/*"
  ],
  jsx: "automatic",
  platform: "node",
  target: "esnext",
  format: "esm",
  watch: watch && {
    onRebuild: console.log
  },
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `global.require = topLevelCreateRequire(import.meta.url);`
    ].join("\n")
  },
  outExtension: {
    ".js": ".mjs"
  }
});
await fs.writeFile(
  "analyze",
  esbuild.analyzeMetafileSync(result.metafile, {
    verbose: true
  })
);

// support/nodejs-runtime
await esbuild.build({
  entryPoints: ["support/nodejs-runtime/index.ts"],
  bundle: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  outExtension: {
    ".js": ".mjs"
  },
  outfile: "./dist/support/custom-resources.mjs"
});

// support/custom-resources
await esbuild.build({
  keepNames: true,
  bundle: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/custom-resources/index.ts"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`
    ].join("")
  },
  outfile: "./dist/support/custom-resources.mjs"
});

console.log("Built");
if (watch) console.log("Watching");
