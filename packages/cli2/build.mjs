import esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";

const OUT = "./dist";
await fs.rm(OUT, { recursive: true });
const pkg = await fs.readFile("package.json").then(JSON.parse);

async function* scan(dir) {
  for (const file of await fs.readdir(dir)) {
    const p = path.join(dir, file);
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
      yield* scan(p);
      continue;
    }
    yield p;
  }
}

for await (const file of scan("./src/core")) {
  const dest = path.join(OUT, path.relative("./src", file));
  await esbuild.build({
    entryPoints: [file],
    outfile: dest,
    target: "esnext",
    format: "esm",
    watch: {
      onRebuild: console.log,
    },
    outExtension: {
      ".js": ".mjs",
    },
  });
}

await esbuild.build({
  entryPoints: ["support/nodejs-runtime/index.ts"],
  bundle: true,
  outdir: "dist/support/nodejs-runtime",
  metafile: true,
  platform: "node",
  target: "esnext",
  external: [...Object.keys(pkg.dependencies)],
  watch: {
    onRebuild: console.log,
  },
  format: "esm",
  outExtension: {
    ".js": ".mjs",
  },
});

const result = await esbuild.build({
  entryPoints: ["src/cli/sst.ts"],
  bundle: true,
  outdir: "dist",
  metafile: true,
  external: [...Object.keys(pkg.dependencies), "../resources"],
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

console.log("Built and watching");
