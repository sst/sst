import path from "path";
import fs from "fs/promises";
import esbuild, { BuildOptions, BuildResult } from "esbuild";
import pulumi from "@pulumi/pulumi";
import { WorkerArgs } from "../components/cloudflare//worker.js";
import { existsAsync } from "../util/fs.js";

export async function build(
  name: string,
  input: pulumi.Unwrap<WorkerArgs> & {
    links?: {
      name: string;
      value: string;
    }[];
  },
) {
  const out = path.join($cli.paths.work, "artifacts", `${name}-src`);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });

  if (!(await existsAsync(input.handler)))
    return {
      type: "error" as const,
      errors: [`Could not find file for handler "${input.handler}"`],
    };

  const build = input.build || {};
  const relative = path.relative($cli.paths.root, path.resolve(input.handler));
  const target = path.join(
    out,
    !relative.startsWith("..") && !path.isAbsolute(input.handler!)
      ? relative
      : "",
    "index.mjs",
  );

  // Rebuilt using existing esbuild context
  const links = Object.fromEntries(
    input.links?.map((item) => [item.name, item.value]) || [],
  );
  const options: BuildOptions = {
    entryPoints: [path.resolve(input.handler)],
    platform: "node",
    loader: build.loader,
    keepNames: true,
    bundle: true,
    logLevel: "silent",
    define: {
      $SST_LINKS: JSON.stringify({}),
    },
    metafile: true,
    format: "esm",
    target: "esnext",
    mainFields: ["module", "main"],
    banner: {
      js: [
        `globalThis.$SST_LINKS = ${JSON.stringify(links)};`,
        build.banner || "",
      ].join("\n"),
    },
    outfile: target,
    sourcemap: false,
    minify: build.minify,
    ...build.esbuild,
  };
  const ctx = await esbuild.context(options);

  try {
    const result = await ctx.rebuild();

    ctx.dispose();

    return {
      type: "success" as const,
      handler: target,
    };
  } catch (ex: any) {
    const result = ex as BuildResult;
    if ("errors" in result) {
      return {
        type: "error" as const,
        errors: result.errors.flatMap((x) => [
          console.log(x.text),
          x.location?.file || "",
          console.log(x.location?.line, "│", x.location?.lineText),
        ]),
      };
    }

    return {
      type: "error" as const,
      errors: [ex.toString()],
    };
  }
}
