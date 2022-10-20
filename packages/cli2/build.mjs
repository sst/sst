import esbuild from "esbuild";
import fs from "fs/promises";

const pkg = await fs.readFile("package.json").then(JSON.parse);

await esbuild.build({
  entryPoints: ["support/nodejs-runtime/index.ts"],
  bundle: true,
  outdir: "dist/support/nodejs-runtime",
  metafile: true,
  platform: "node",
  target: "esnext",
  external: [...Object.keys(pkg.dependencies)],
  format: "esm",
  outExtension: {
    ".js": ".mjs",
  },
  watch: {
    onRebuild: console.log,
  },
});

const result = await esbuild.build({
  entryPoints: ["src/cli/sst.ts"],
  bundle: true,
  outdir: "dist",
  metafile: true,
  external: [
    ...Object.keys(pkg.dependencies),
    "pg",
    "mysql2",
    "better-sqlite3",
    "../resources",
  ],
  jsx: "automatic",
  platform: "node",
  loader: {
    ".js": "tsx",
    ".ts": "tsx",
  },
  target: "esnext",
  format: "esm",
  watch: {
    onRebuild: console.log,
  },
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `global.require = topLevelCreateRequire(import.meta.url);`,
    ].join("\n"),
  },
});
