import esbuild from "esbuild";

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
