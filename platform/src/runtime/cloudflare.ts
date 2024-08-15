import path from "path";
import fs from "fs/promises";
import esbuild, { BuildOptions, BuildResult } from "esbuild";
import pulumi from "@pulumi/pulumi";
import { WorkerArgs } from "../components/cloudflare//worker.js";
import { existsAsync } from "../util/fs.js";

export async function build(name: string, input: pulumi.Unwrap<WorkerArgs>) {
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
  const parsed = path.parse(path.resolve(input.handler));
  const target = path.join(
    out,
    !relative.startsWith("..") && !path.isAbsolute(input.handler!)
      ? relative
      : "",
    "index.mjs",
  );

  const options: BuildOptions = {
    // entryPoints: [path.resolve(input.handler)],
    stdin: {
      contents: `
      import handler from "${path.join(parsed.dir, parsed.name)}"
      import { wrapCloudflareHandler } from "sst"
      export default wrapCloudflareHandler(handler)
      `,
      loader: "ts",
      resolveDir: parsed.dir,
    },
    platform: "node",

    loader: build.loader,
    keepNames: true,
    bundle: true,
    logLevel: "silent",
    metafile: true,
    format: "esm",
    target: "esnext",
    mainFields: ["module", "main"],
    outfile: target,
    sourcemap: false,
    conditions: ["workerd", "worker", "browser"],
    minify: build.minify,
    ...build.esbuild,
    plugins: [
      {
        name: "node-prefix",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (BUILTIN_MODULES.has(args.path)) {
              return { path: "node:" + args.path, external: true };
            }
          });
        },
      },
      ...(build.esbuild?.plugins ?? []),
    ],
    external: [...(build.esbuild?.external ?? []), "cloudflare:workers"],
    banner: {
      js: [build.banner || "", build.esbuild?.banner || ""].join("\n"),
    },
  };
  const ctx = await esbuild.context(options);

  try {
    const result = await ctx.rebuild();

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
  } finally {
    ctx.dispose();
  }
}

const BUILTIN_MODULES = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);
