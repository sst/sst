import esbuild from "esbuild";

// support/bridge
await esbuild.build({
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./functions/bridge/index.ts"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module';`,
      `const require = topLevelCreateRequire(import.meta.url);`,
    ].join(""),
  },
  outfile: "./dist/bridge/index.mjs",
});
