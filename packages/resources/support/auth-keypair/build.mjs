import esbuild from "esbuild";

await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/auth-keypair/auth-keypair.ts"],
  banner: {
    js: [
      `import { createRequire as topLevelCreateRequire } from 'module'`,
      `const require = topLevelCreateRequire(import.meta.url)`,
    ].join("\n"),
  },
  outfile: "./dist/support/auth-keypair/auth-keypair.mjs",
});
