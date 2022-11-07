import esbuild from "esbuild";
import fs from "fs/promises";

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
  outdir: "./dist/support/nodejs-runtime/"
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
  outExtension: {
    ".js": ".mjs"
  },
  outdir: "./dist/support/custom-resources/"
});

// support/bridge
await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/bridge/bridge.ts"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`
    ].join("")
  },
  outfile: "./dist/support/bridge/bridge.mjs"
});

// support/static-site-stub
await fs.cp("support/static-site-stub", "dist/support/static-site-stub", {
  recursive: true
});

// support/base-site-custom-resource
await fs.cp(
  "support/base-site-custom-resource",
  "dist/support/base-site-custom-resource",
  {
    recursive: true
  }
);

await fs.cp(
  "support/base-site-archiver.cjs",
  "dist/support/base-site-archiver.cjs",
  {
    recursive: true
  }
);

console.log("Built");
if (watch) console.log("Watching");
