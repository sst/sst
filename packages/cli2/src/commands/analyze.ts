import esbuild from "esbuild";
export interface Input {
  target: string;
}

export async function analyze(input: Input) {
  const result = await esbuild.build({
    target: "esnext",
    platform: "node",
    entryPoints: [input.target],
    format: "esm",
    minify: true,
    mainFields: ["module", "main"],
    bundle: true,
    metafile: true,
    write: false,
  });
  const analysis = await esbuild.analyzeMetafile(result.metafile!, {
    verbose: true,
  });

  console.log(analysis);
}
