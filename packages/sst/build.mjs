import esbuild from "esbuild";
import fs from "fs/promises";

// Copy package.json to dist, excluding publishConfig
await fs.mkdir("dist", { recursive: true });
const { publishConfig, ...pkg } = await fs
  .readFile("package.json")
  .then(JSON.parse);
await fs.writeFile("dist/package.json", JSON.stringify(pkg, null, 2), {
  encoding: "utf-8",
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
fs.cp(`support/bridge/Dockerfile`, `dist/support/bridge/Dockerfile`);

// support/event-bus-retrier
await esbuild.build({
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
  [
    "bootstrap-metadata-function",
    "custom-resources",
    "job-manager",
    "script-function",
    "signing-function",
    "ssr-warmer",
  ].map((dir) =>
    esbuild.build({
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

// Move support scripts that need to be transpiled
await Promise.all(
  ["base-site-archiver", "ssr-site-function-archiver"].map((file) =>
    esbuild.build({
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
    "nixpacks",
    "service-dev-function",
  ].map((dir) =>
    fs.cp(`support/${dir}`, `dist/support/${dir}`, {
      recursive: true,
    })
  )
);

// Declaration maps:

// 1. Copy src to dist for declaration maps
await fs.cp("src", "dist/src", { recursive: true });

// 2. Write tsconfig.json to dist, referencing the root tsconfig.json
await fs.writeFile(
  "dist/tsconfig.json",
  JSON.stringify(
    {
      extends: "../tsconfig.json",
      include: ["src"],
    },
    null,
    2
  ),
  { encoding: "utf-8" }
);

console.log("Built");
