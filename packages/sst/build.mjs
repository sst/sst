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

// support/event-bus-retrier
await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/event-bus-retrier/index.ts"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outfile: "./dist/support/event-bus-retrier/index.mjs",
});

// support/rds-migrator
// note: do not add topLevelCreateRequire banner b/c the
//       migrator function will get built again in RDS.
await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/rds-migrator/index.mjs"],
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

// Move support packages that need to be transpiled
await Promise.all(
  ["bootstrap-metadata-function", "custom-resources", "script-function"].map(
    (dir) =>
      esbuild.build({
        keepNames: true,
        bundle: true,
        platform: "node",
        target: "esnext",
        format: "esm",
        entryPoints: [`./support/${dir}/index.ts`],
        banner: {
          js: [
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
          ].join(""),
        },
        outExtension: {
          ".js": ".mjs",
        },
        outdir: `./dist/support/${dir}/`,
      })
  )
);

// Move support packages that need to be transpiled, but will be used
// in sst.Function that will get transpiled again.
// Note: do not add `createRequire` banner.
await Promise.all(
  ["job-invoker"].map((dir) =>
    esbuild.build({
      keepNames: true,
      bundle: true,
      platform: "node",
      target: "esnext",
      format: "esm",
      entryPoints: [`./support/${dir}/index.ts`],
      outExtension: {
        ".js": ".mjs",
      },
      outdir: `./dist/support/${dir}/`,
    })
  )
);

// Move support scripts that need to be transpiled
await Promise.all(
  ["base-site-archiver", "ssr-site-function-archiver"].map((file) =>
    esbuild.build({
      keepNames: true,
      bundle: true,
      minify: true,
      platform: "node",
      target: "esnext",
      format: "esm",
      entryPoints: [`./support/${file}.cjs`],
      banner: {
        js: [
          `import { createRequire as topLevelCreateRequire } from 'module';`,
          `const require = topLevelCreateRequire(import.meta.url);`,
        ].join(""),
      },
      outfile: `./dist/support/${file}.mjs`,
    })
  )
);

// Move support packages that don't need to be transpiled
await Promise.all(
  [
    "remix-site-function",
    "sls-nextjs-site-stub",
    "sls-nextjs-site-build-helper",
    "sls-nextjs-site-function-code-replacer",
    "ssr-site-function-stub",
    "base-site-custom-resource",
    "python-runtime",
    "java-runtime",
    "dotnet31-bootstrap",
    "dotnet6-bootstrap",
    "certificate-requestor",
  ].map((dir) =>
    fs.cp(`support/${dir}`, `dist/support/${dir}`, {
      recursive: true,
    })
  )
);

console.log("Built");
if (watch) console.log("Watching");
