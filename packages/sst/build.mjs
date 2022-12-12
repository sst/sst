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
    "./src/constructs/*",
  ],
  jsx: "automatic",
  platform: "node",
  target: "esnext",
  format: "esm",
  watch: watch && {
    onRebuild: console.log,
  },
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `global.require = topLevelCreateRequire(import.meta.url);`,
    ].join("\n"),
  },
  outExtension: {
    ".js": ".mjs",
  },
});

// support/nodejs-runtime
await esbuild.build({
  entryPoints: ["support/nodejs-runtime/index.ts"],
  bundle: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  outExtension: {
    ".js": ".mjs",
  },
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outdir: "./dist/support/nodejs-runtime/",
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
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outExtension: {
    ".js": ".mjs",
  },
  outdir: "./dist/support/custom-resources/",
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
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outfile: "./dist/support/bridge/bridge.mjs",
});

// support/rds-migrator
await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/rds-migrator/index.mjs"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outfile: "./dist/support/rds-migrator/index.mjs",
});

// support/edge-function
await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: [
    "./support/edge-function/edge-lambda.ts",
    "./support/edge-function/edge-lambda-version.ts",
    "./support/edge-function/s3-bucket.ts",
  ],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outExtension: {
    ".js": ".mjs",
  },
  outdir: "./dist/support/edge-function/",
});

// Move support packages that don't need to be transpiled
const moveToDist = [
  "astro-site-html-stub",
  "edge-function-code-replacer",
  "nextjs-site-html-stub",
  "remix-site-function",
  "remix-site-html-stub",
  "sls-nextjs-site-stub",
  "sls-nextjs-site-build-helper",
  "solid-start-site-html-stub",
  "ssr-site-function-stub",
  "static-site-stub",
  "base-site-custom-resource",
];
await Promise.all(
  moveToDist.map((dir) =>
    fs.cp(`support/${dir}`, `dist/support/${dir}`, {
      recursive: true,
    })
  )
);

await fs.cp(
  "support/base-site-archiver.cjs",
  "dist/support/base-site-archiver.cjs",
  {
    recursive: true,
  }
);
await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/base-site-archiver.cjs"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outfile: "./dist/support/base-site-archiver.mjs",
});

console.log("Built");
if (watch) console.log("Watching");
