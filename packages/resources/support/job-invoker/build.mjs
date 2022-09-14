import esbuild from "esbuild";

await esbuild.build({
  keepNames: true,
  bundle: true,
  minify: true,
  platform: "node",
  target: "esnext",
  format: "esm",
  entryPoints: ["./support/job-invoker/index.ts"],
  outfile: "./dist/support/job-invoker/index.mjs",
});
